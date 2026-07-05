import { User } from '@prisma/client';
import * as crypto from 'crypto'; // 新規登録時の UUID 生成用
import { prisma } from "@/lib/prisma";
import { updateGoal, registerGoal, deleteGoal} from './GoalService';
import { updateLoginManagement, deleteLoginManagement, registerLoginManagement } from './LoginManagementService';
import { deleteSpaces } from './SpaceService';


export async function checkUser(user_id: string): Promise<boolean>{

  const user = await prisma.user.findUnique({
    where: {
      id: user_id,
    },
  });

  // 検索条件：delete_flag = 0 
  if (!user || user.delete_flag !== 0) {
    return false;
  }

  return true;
}
/**
 * メソッド名称：getUser
 * 概要：ユーザー情報を取得
 */

export async function getUser(id: string): Promise<User> {
  try {
    // 引数の id をキーとして、ユーザーテーブル（users）から該当するレコード1件を一件検索（findUnique）する。
    const user = await prisma.user.findUnique({
      where: {
        id: id,
        // ※ Prismaの findUnique で複合ユニーク（id と delete_flag の組み合わせ等）がない場合は、
        // findFirst を使用して delete_flag: 0 を担保するのが確実です。
      },
    });

    // 検索条件：delete_flag = 0 
    if (!user || user.delete_flag !== 0) {
    }

    // 検索完了後、特定されたユーザーの登録情報のデータを丸ごと返却する。
    return user as User;
  } catch (error) {
    // 例外処理：データベース接続エラー等の例外発生時は、呼び出し元にエラーをそのまま返す
    throw error;
  }
}

export async function registerUser(google_id: string, email: string) {
  try {
    const existingUser = await prisma.user.findFirst({
      where: { google_id: google_id },
    });

    // 既に有効なユーザーが存在する場合
    if (existingUser && existingUser.delete_flag === 0) {
      await updateLoginManagement(existingUser.id);

      if (existingUser.email !== email) {
        return await updateEmail(existingUser.id, google_id, email);
      }
      return existingUser;
    }

    // 新規作成 または 論理削除済みユーザーの復活（トランザクション内で実行）
    return await prisma.$transaction(async (tx) => {
      const isNewUser = !existingUser;
      const newUuid = crypto.randomUUID();

      // 1. ユーザー作成/更新
      const user = await tx.user.upsert({
        where: { google_id: google_id },
        update: { delete_flag: 0, email: email },
        create: {
          id: newUuid,
          google_id: google_id,
          email: email,
          delete_flag: 0,
        },
      });

      // 2. 関連データの処理（tx を渡すことでトランザクション内に含める）
      if (isNewUser) {
        // ★ ここで tx を渡す！
        await registerGoal(user.id, "", tx);
        await registerLoginManagement(user.id, tx);
      } else {
        // ★ ここでも tx を渡す！
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
export async function deleteUser(user_id: string): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      // 各サービスの論理削除関数が tx を受け取れる前提
      await deleteSpaces(user_id, "ALL", tx);
      await deleteLoginManagement(user_id, tx);
      await deleteGoal(user_id, tx);

      await tx.user.update({
        where: { id: user_id },
        data: { 
          delete_flag: 1,
          username: "" // ★ null の代わりに空文字を入れる
        }
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
