import { User } from '@prisma/client';
import * as crypto from 'crypto'; // 新規登録時の UUID 生成用
import { prisma } from "@/lib/prisma";
import { updateGoal, registerGoal, deleteGoal} from './GoalService';
import { updateLoginManagement, deleteLoginManagement, registerLoginManagement } from './LoginManagementService';
import { deleteSpaces } from './SpaceService';



/**
 * メソッド名称：getUser
 * 概要：ユーザー情報を取得
 */
export async function registerUser(google_id: string, email: string): Promise<User> {
  try {
    const existingUser = await prisma.user.findFirst({
      where: { google_id: google_id },
    });

    // 既に有効なユーザーが存在する場合
    if (existingUser && existingUser.delete_flag === 0) {
      if (existingUser.email !== email) {
        return await updateEmail(existingUser.id, google_id, email);
      }
      return existingUser;
    }

    // 新規作成 または 論理削除済みユーザーの復活
    return await prisma.$transaction(async (tx) => {
      const isNewUser = !existingUser; // ユーザーがDBに存在しない場合は新規
      const newUuid = crypto.randomUUID();

      const user = await tx.user.upsert({
        where: { google_id: google_id },
        update: { delete_flag: 0, email: email, created_at: new Date() },
        create: {
          id: newUuid,
          google_id: google_id,
          email: email,
          delete_flag: 0,
          created_at: new Date(),
        },
      });

      if (isNewUser) {
        // ★【新規作成時】登録処理を呼ぶ
        await registerGoal(user.id, ""); // 初期目標の登録
        await registerLoginManagement(user.id); // ログイン管理の登録
      } else {
        // ★【復活時】更新（リセット）処理を呼ぶ
        await updateGoal(user.id, "", 0);
        await updateLoginManagement(user.id, 1, 0, tx);
      }

      return user;
    });
  } catch (error) {
    throw error;
  }
}

/**
 * メソッド名称：deleteUser
 * 概要：アカウント削除（関連データ一括論理削除）
 */
export async function deleteUser(user_id: string): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      // 各サービスの論理削除関数が tx を受け取れる前提
      await deleteSpaces(user_id, "ALL", tx);
      await deleteLoginManagement(user_id, tx);
      await deleteGoal(user_id, tx);

      await tx.user.update({
        where: { id: user_id },
        data: { delete_flag: 1 },
      });
    });
    return true;
  } catch (error) {
    console.error("退会処理エラー:", error);
    return false;
  }
}
/**
 * メソッド名称：updateUsername
 * 概要：ユーザー名の更新
 */
export async function updateUsername(id: string, username: string): Promise<User> {
  try {
    const updatedUser = await prisma.user.update({
      where: {
        id: id,
        delete_flag: 0, // 条件：有効なユーザーのみ
      },
      data: {
        username: username, // ※DBカラム名に合わせて適宜変更（例: name など）
      },
    });
    return updatedUser as User;
  } catch (error) {
    throw error;
  }
}

/**
 * メソッド名称：getUsername
 * 概要：ユーザ名の取得
 */
export async function getUsername(id: string): Promise<string | null> {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: id,
        delete_flag: 0,
      },
      select: {
        username: true, // ユーザー名のみを取得して返却する
      },
    });

    // user が存在しない場合は null を返す
    if (!user) {
      return null;
    }

    // ユーザーが存在すればその username (または null) を返す
    return user.username;
  } catch (error) {
    throw error;
  }
}

/**
 * メソッド名称：updateEmail
 * 概要：メールアドレスの更新
 */
export async function updateEmail(id: string, google_id: string, email: string): Promise<User> {
  try {
    const updatedUser = await prisma.user.update({
      where: {
        id: id,
        google_id: google_id,
        delete_flag: 0,
      },
      data: {
        email: email,
      },
    });
    return updatedUser as User;
  } catch (error) {
    throw error;
  }
}

/**
 * メソッド名称：getUserId
 * 概要：ユーザIDの取得
 */
export async function getUserId(google_id: string): Promise<string | null> {
  try {
    const user = await prisma.user.findFirst({
      where: {
        google_id: google_id,
        delete_flag: 0,
      },
    });

    // 条件に一致するレコードが存在する場合：特定されたユーザーの「id」のみを返却する
    // 条件に一致するレコードが存在しない場合：nullを返却する
    return user ? user.id : null;
  } catch (error) {
    throw error;
  }
}
