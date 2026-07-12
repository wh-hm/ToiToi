import { prisma } from "@/lib/prisma";
import { LoginManagement, Prisma } from "@prisma/client";

// トランザクション型の共通定義
export type Tx = Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
// ==========================================
// 1. ユーザーの現在のログイン状況を取得する
// ==========================================
export const getLoginManagement = async (userId: string): Promise<LoginManagement> => {
  const data = await prisma.loginManagement.findUnique({
    where: { user_id: userId }
  });

  if (!data) throw new Error("ログイン管理レコードが見つかりません");
  return data;
};

// ==========================================
// 2. ユーザーの初回ログイン時にログイン管理レコードを初期登録する
// ==========================================
export const registerLoginManagement = async (userId: string, tx?: Tx): Promise<LoginManagement> => {
  const db = tx || prisma;
  return await db.loginManagement.create({
    data: {
      user_id: userId,
      total_login_days: 1,
      current_streak: 1,
      last_login_at: new Date(),
      delete_flag: 0,
    },
  });
};

// ==========================================
// 3. ユーザー退会時等にログイン管理情報を論理削除する
// ==========================================
export const deleteLoginManagement = async (userId: string, tx?: Tx): Promise<boolean> => {
  const db = tx || prisma;
  const result = await db.loginManagement.updateMany({
    where: { user_id: userId, delete_flag: 0 },
    data: { delete_flag: 1, current_streak: 1, total_login_days: 1 }
  });
  return result.count > 0;
};

export const updateLoginManagement = async (userId: string, tx?: Tx): Promise<LoginManagement> => {
  const db = tx || prisma;

  const currentData = await db.loginManagement.findUnique({ 
    where: { user_id: userId } 
  });
  
  if (!currentData) return await registerLoginManagement(userId, db);
  
  const now = new Date();
  const today = new Date(now).setHours(0, 0, 0, 0);
  const lastLogin = new Date(currentData.last_login_at).setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));

  let { current_streak: newStreak, total_login_days: newTotalDays } = currentData;

  if (diffDays > 0) {
    newTotalDays += 1;
    newStreak = (diffDays === 1) ? newStreak + 1 : 1;
  }

  return await db.loginManagement.update({
    where: { user_id: userId },
    data: {
      last_login_at: now,
      total_login_days: newTotalDays,
      current_streak: newStreak,
      delete_flag: 0
    }
  });
};