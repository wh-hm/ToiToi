import { prisma } from "@/lib/prisma";
import { deleteImage } from "./StorageService";
import sanitizeHtml from "sanitize-html"; // サニタイズ用ライブラリ

// 共通設定：HTMLタグを全除去してテキストとして保持する
const sanitizeOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

/**
 * 1. 全メッセージ取得
 */
export const getQuestionChats = async (question_id: number, user_id: string, tx?: any): Promise<any[]> => {
  try {
    const db = tx || prisma;

    const questionExists = await db.questions.findFirst({
      where: { id: question_id, delete_flag: 0 },
    });

    if (!questionExists) {
      throw new Error("対象の質問が存在しないか、既に削除されています。");
    }

    return await db.questionChats.findMany({
      where: { question_id: question_id, delete_flag: 0 },
      orderBy: { created_at: 'asc' },
    });
  } catch (error) {
    console.error(`question_id: ${question_id} のチャット取得中にエラーが発生しました:`, error);
    throw error;
  }
};

/**
 * 2. チャット投稿登録
 */
export async function registerQuestionChat(
  question_id: number,
  user_id: string,
  content: string | null,
  image_url?: string | null,
  stamp?: string | null
) {
  if (typeof question_id !== 'number' || isNaN(question_id)) {
    throw new Error("Invalid question_id");
  }

  // サニタイズ実施
  const cleanContent = content ? sanitizeHtml(content, sanitizeOptions) : null;

  return await prisma.questionChats.create({
    data: {
      question_id,
      user_id,
      content: cleanContent,
      image_url,
      stamp,
      delete_flag: 0,
      nice_flag: 0,
      created_at: new Date(),
    },
  });
}

/**
 * 3. チャット編集更新
 */
export async function updateQuestionChat(
  id: number,
  question_id: number,
  user_id: string,
  content: string,
  tx?: any
): Promise<any> {
  try {
    const db = tx || prisma;

    // サニタイズ実施
    const cleanContent = sanitizeHtml(content, sanitizeOptions);

    const result = await db.questionChats.updateMany({
      where: { id, question_id, user_id, delete_flag: 0 },
      data: { content: cleanContent },
    });

    if (result.count === 0) {
      throw new Error("対象のチャットメッセージが存在しないか、編集権限がありません。");
    }

    return await db.questionChats.findUnique({ where: { id } });
  } catch (error) {
    console.error(`chat_id: ${id} の更新中にエラーが発生しました:`, error);
    throw error;
  }
}

/**
 * 4. 単体削除
 */
export async function deleteQuestionChat(
  id: number,
  question_id: number,
  user_id: string,
  tx?: any
): Promise<boolean> {
  try {
    const db = tx || prisma;
    const chatRecord = await db.questionChats.findFirst({
      where: { id, question_id, user_id, delete_flag: 0 },
    });

    if (!chatRecord) return false;

    if (chatRecord.image_url) await deleteImage(chatRecord.image_url);

    await db.questionChats.updateMany({
      where: { id, question_id, user_id },
      data: { delete_flag: 1 },
    });

    return true;
  } catch (error) {
    console.error(`chat_id: ${id} の削除中にエラーが発生しました:`, error);
    return false;
  }
}

/**
 * 5. 一括削除
 */
export async function deleteQuestionChats(
  ids: number[] | null,
  question_id: number,
  user_id: string,
  tx?: any
): Promise<boolean> {
  if (!ids || ids.length === 0) return false;

  const db = tx || prisma;
  try {
    for (const id of ids) {
      const isSuccess = await deleteQuestionChat(id, question_id, user_id, db);
      if (!isSuccess) return false;
    }
    return true;
  } catch (error) {
    console.error(`一括削除中に例外が発生しました:`, error);
    return false;
  }
}

/**
 * 6. いいね切り替え
 */
export async function toggleLike(id: number, question_id: number, user_id: string, tx?: any): Promise<any> {
  const db = tx || prisma;
  const chatRecord = await db.questionChats.findFirst({
    where: { id, question_id, delete_flag: 0, user_id },
  });

  if (!chatRecord) throw new Error("対象が見つかりません。");

  return await db.questionChats.update({
    where: { id },
    data: { nice_flag: chatRecord.nice_flag === 0 ? 1 : 0 },
  });
}

/**
 * 7. 画像URL一覧取得
 */
export async function getChatImagesUrl(user_id: string, tx?: any): Promise<string[]> {
  const db = tx || prisma;
  const chats = await db.questionChats.findMany({
    where: { delete_flag: 0, image_url: { not: null } },
    select: { image_url: true },
  });
  return chats.map((chat: any) => chat.image_url as string);
}