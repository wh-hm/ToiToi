import { prisma } from "@/lib/prisma";
import { deleteImage, getImages } from "./StorageService";
import { Prisma } from "@prisma/client";


// Prismaのトランザクション型（dbがどちらでもいいように）
type Tx = Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function checkQuestionChat(chatId: number, questionId: number, userId: string): Promise<boolean> {
  const chat = await prisma.questionChats.findFirst(
    { where: { 
      id: chatId, 
      questionId: questionId, 
      user_id: userId, 
      delete_flag: 0 }
    });

  if (!chat) return false;
  return true;
}


/**
 * 1. 全メッセージ取得（署名付きURL変換対応版）
 */
export const getQuestionChats = async (questionId: number, userId: string) => {

  // 質問の存在確認
  const questionExists = await prisma.question.findFirst({
    where: { id: questionId, delete_flag: 0, user_id: userId },
  });

  if (!questionExists) {
    throw new Error("対象の質問が存在しないか、既に削除されています。");
  }

  // チャットデータ取得
  const chats = await prisma.questionChats.findMany({
    where: { question_id: questionId, delete_flag: 0, user_id: userId },
    orderBy: { created_at: 'asc' },
  });

  // 画像URLがあるものだけ抽出
  const imageUrls = chats
    .map((chat) => chat.image_url)
    .filter((url): url is string => url !== null && url !== "");

  // R2から署名付きURLを取得
  // ※getImages が引数として URL の配列を受け取り、URL の配列を返す前提
  const signedImageUrls = imageUrls.length > 0 ? await getImages(imageUrls) : [];

  // チャットデータに署名付きURLをマッピングして返す
  return chats.map((chat) => ({
    ...chat,
    signedImageUrl: chat.image_url 
      ? (signedImageUrls[imageUrls.indexOf(chat.image_url)] || null) 
      : null
  }));
};

/**
 * 2. チャット投稿登録
 */
export async function registerQuestionChat(
  questionId: number,
  userId: string,
  message?: string | null,
  imageUrl?: string | null,
  stamp?: string | null,
) {
  // tx があればそれを使用、なければ通常の prisma インスタンスを使用

  return await prisma.questionChats.create({
    data: {
      question_id: questionId,
      user_id: userId,
      message: message,
      image_url: imageUrl,
      stamp: stamp,
      delete_flag: 0,
      nice_flag: 0,
      created_at: new Date(), // 必要であれば追加
    },
  });
}

/**
 * 3. チャット編集更新
 */
export async function updateQuestionChat(chatId: number, questionId: number, userId: string, message: string) {
  
  const result = await prisma.questionChats.updateMany({
    where: { id: chatId, 
      question_id: questionId, 
      user_id: userId, 
      delete_flag: 0 },
    data: { message, updated_at: new Date() },
  });

  if (result.count === 0) throw new Error("対象のチャットが存在しないか、権限がありません。");
  return await prisma.questionChats.findUnique({ where: { id: chatId } });
}



/**
 * 4. 単体削除 (画像削除含む)
 */
export async function deleteQuestionChat(chatId: number, questionId: number, userId: string): Promise<boolean> {
  const chat = await prisma.questionChats.findFirst({ 
    where: { id: chatId, question_id: questionId, user_id: userId, delete_flag: 0 } 
  });

  if (!chat) return false;

  await prisma.questionChats.update({
    where: { id: chatId },
    data: { delete_flag: 1 },
  });

  if (chat.image_url) await deleteImage(chat.image_url);
  return true;
}


/**
 * 6. いいね切り替え
 */
export async function toggleLike(chatId: number, questionId: number, userId: string) {
  const chat = await prisma.questionChats.findFirst({ where: { id:chatId, question_id: questionId, delete_flag: 0, user_id: userId } });
  if (!chat) throw new Error("対象が見つかりません。");

  return await prisma.questionChats.update({
    where: { id: chatId },
    data: { nice_flag: chat.nice_flag === 0 ? 1 : 0 },
  });
}


export async function deleteQuestionChats(
  ids: number[], questionId: number, userId: string, tx?: Tx
): Promise<boolean> {
  if (!ids.length) return false;
  const db = tx || prisma;

  try {
    // 1. 論理削除対象の画像を取得
    const chats = await db.questionChats.findMany({
      where: { id: { in: ids }, question_id: questionId, user_id: userId },
      select: { image_url: true }
    });

    // 2. 一括論理削除
    const result = await db.questionChats.updateMany({
      where: { id: { in: ids }, question_id: questionId, user_id: userId, delete_flag: 0 },
      data: { delete_flag: 1 },
    });

    // 3. 画像削除（成功したもののみ実行）
    if (result.count > 0) {
      const imagesToDelete = chats.map(c => c.image_url).filter((url): url is string => !!url);
      await Promise.all(imagesToDelete.map(url => deleteImage(url)));
    }

    return result.count > 0;
  } catch (e) {
    console.error("一括削除失敗:", e);
    return false;
  }
}