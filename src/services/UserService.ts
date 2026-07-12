import { User } from '@prisma/client';
import * as crypto from 'crypto'; // 新規登録時の UUID 生成用
import { prisma } from "@/lib/prisma";
import { updateGoal, registerGoal, deleteGoal} from './GoalService';
import { updateLoginManagement, deleteLoginManagement, registerLoginManagement } from './LoginManagementService';
import { deleteSpaces } from './SpaceService';

export async function checkUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return !!user && user.delete_flag === 0;
}

/**
 * メソッド名称：getUser
 * 概要：ユーザー情報を取得
 */
export async function getUser(id: string): Promise<User | null> {
  return await prisma.user.findFirst({
    where: { id, delete_flag: 0 },
  });
}

export async function registerUser(googleId: string, email: string) {
  try {
    const existingUser = await prisma.user.findFirst({
      where: { google_id: googleId },
    });
    // 既に有効なユーザーが存在する場合
    if (existingUser && existingUser.delete_flag === 0) {
      await updateLoginManagement(existingUser.id);

      if (existingUser.email !== email) {
        return await updateEmail(existingUser.id, googleId, email);
      }
      return existingUser;
    }
    // 新規作成 または 論理削除済みユーザーの復活（トランザクション内で実行）
    return await prisma.$transaction(async (tx) => {
      const isNewUser = !existingUser;
      const newUuid = crypto.randomUUID();

      const user = await tx.user.upsert({
        where: { google_id: googleId },
        update: { delete_flag: 0, email: email },
        create: {
          id: newUuid,
          google_id: googleId,
          email: email,
          delete_flag: 0,
        },
      });
      if (isNewUser) {
        await registerGoal(user.id, "", tx);
        await registerLoginManagement(user.id, tx);
      } else {
        await updateGoal(user.id, "", 0, 0, tx);
        await updateLoginManagement(user.id, tx);
      }
      return user;
    });
  } catch (error) {
    console.error("User registration failed:", error);
    throw error;
  }
}
/**
 * メソッド名称：deleteUser
 * 概要：アカウント削除（関連データ一括論理削除）
 */
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      await deleteSpaces(userId, "ALL", tx);
      await deleteLoginManagement(userId, tx);
      await deleteGoal(userId, tx);

      await tx.user.update({
        where: { id: userId },
        data: { delete_flag: 1, username: "" }
      });
    });
    return true;
  } catch (error) {
    console.error("退会処理エラー:", error);
    throw error;
  }
}

/**
 * メソッド名称：updateUsername
 * 概要：ユーザー名の更新
 */
export async function updateUsername(id: string, username: string): Promise<User> {
  return await prisma.user.update({
    where: { id, delete_flag: 0 },
    data: { username },
  });
}

/**
 * メソッド名称：getUsername
 * 概要：ユーザ名の取得
 */
export async function getUsername(id: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { id, delete_flag: 0 },
    select: { username: true },
  });
  return user?.username ?? null;
}

/**
 * メソッド名称：updateEmail
 * 概要：メールアドレスの更新
 */
export async function updateEmail(id: string, googleId: string, email: string): Promise<User> {
  return await prisma.user.update({
    where: { id, google_id: googleId, delete_flag: 0 },
    data: { email },
  });
}

/**
 * メソッド名称：getUserId
 * 概要：ユーザIDの取得
 */
export async function getUserId(googleId: string): Promise<User | null> {
  // ログイン処理等で利用される前提のため、有効なユーザーのみを対象に
  return await prisma.user.findFirst({
    where: { google_id: googleId, delete_flag: 0 },
  });
}