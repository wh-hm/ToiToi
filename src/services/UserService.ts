import { prisma } from "@/lib/prisma";
import { registerLoginManagement } from "@/services/LoginManagementService";

// ユーザーが存在するかチェック
export const existsUser = async (google_id: string): Promise<string | null> => {
  const user = await prisma.user.findFirst({
    where: { google_id },
  });
  return user ? user.id : null;
};

//ユーザ名を取得
export const getUsername = async (google_id: string): Promise<string | null> => {
  const user = await prisma.user.findFirst({
    where: { google_id },
  });
  return user ? user.username : null;
};

//ユーザidを取得
export const getUserId= async (google_id: string): Promise<string | null> => {
  const user = await prisma.user.findFirst({
    where: { google_id },
  });
  return user ? user.id : null;
};

//ユーザ作成
// ユーザー作成（存在しない場合）
export const registerUsername = async (google_id: string, email: string) => {
  // トランザクションを使って「ユーザー作成」と「ログイン管理初期化」を同時に行う
  return await prisma.$transaction(async (tx) => {
    // 1. ユーザー作成
    const newUser = await tx.user.create({
      data: {
        id: crypto.randomUUID(), // UUID生成
        google_id: google_id,
        email: email,
      },
    });

    // 2. ログイン管理マスタの初期化 (テーブル定義に合わせて)
    await registerLoginManagement(tx, newUser.id);

    return newUser;
  });
};

// ユーザー名更新
export const updateUsername = async (google_id: string, username: string): Promise<boolean> => {
  try {
    await prisma.user.update({
      where: { google_id },
      data: { username },
    });
    return true;
  } catch (e) {
    return false;
  }
};

