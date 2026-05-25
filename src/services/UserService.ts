import { prisma } from "@/lib/prisma";
import { registerLoginManagement, deleteLoginManagement } from "@/services/LoginManagementService";
import { deleteSpaces } from "@/services/SpaceService";


// ユーザーが存在するかチェック
export const existsUser = async (google_id: string): Promise<string | null> => {
  const user = await prisma.user.findFirst({
    where: { 
      google_id,
      delete_flag:0
     },
  });
  return user ? user.id : null;
};

//ユーザ名を取得
export const getUsername = async (user_id: string): Promise<string | null> => {
  const user = await prisma.user.findFirst({
    where: { 
      id:user_id,
      delete_flag:0
     },
  });
  return user ? user.username : null;
};

//ユーザidを取得
export const getUserId= async (google_id: string): Promise<string | null> => {
  const user = await prisma.user.findFirst({
    where: { 
      google_id,
    delete_flag:0
   },
  });
  return user ? user.id : null;
};


// ユーザー作成（存在しない場合は作成、削除済みなら復活）
export const registerUser = async (google_id: string, email: string) => {
  // 1. 既存ユーザーを探す
  const existingUser = await prisma.user.findFirst({
    where: { google_id, delete_flag: 0 },
  });

  // 既存ユーザーがいる場合、メールアドレスをチェックする
  if (existingUser) {
    if (existingUser.email !== email) {
      console.log("メールアドレスの変更を検知しました。更新します...");
      // メールアドレスが異なれば更新
      await updateEmail(existingUser.id, email);
      // 更新後の最新データを返したい場合はここで再度取得するか、
      // 戻り値として更新後のオブジェクトを返すように updateEmail を調整する
      return { ...existingUser, email }; 
    }
    return existingUser;
  }

  // 2. 新規または復活（既存ユーザーがいなかった場合）
  return await prisma.$transaction(async (tx) => {
    return await tx.user.upsert({
      where: { google_id },
      update: {
        delete_flag: 0,
        email: email, // 復活時にもメールを最新に更新
        created_at: new Date(),
      },
      create: {
        id: crypto.randomUUID(),
        google_id: google_id,
        email: email,
      },
    });
  });
};

// メールアドレスの更新
export const updateEmail = async (userId: string, newEmail: string): Promise<boolean> => {
  try {
    // 既存のユーザーが存在するか確認してから更新
    await prisma.user.update({
      where: { 
        id: userId,
        delete_flag: 0
      },
      data: { 
        email: newEmail 
      },
    });
    return true;
  } catch (e) {
    console.error("メールアドレス更新エラー:", e);
    return false;
  }
};