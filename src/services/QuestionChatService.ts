import { prisma } from "@/lib/prisma";
import { deleteImage, getImages } from "./StorageService";
import { Prisma } from "@prisma/client";


// Prismaのトランザクション型（dbがどちらでもいいように）
type Tx = Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export async function checkQuestionChat(chatId: number, questionId: number, userId: string): Promise<boolean> {
  const chat = await prisma.questionChats.findFirst(
    { where: { 
      id: chatId, 
      question_id: questionId, 
      user_id: userId, 
      delete_flag: 0 }
    });

  if (!chat) return false;
  return true;
}

export async function getQuestionChatsWithImages(userId: string, questionId: number) {
  // 1. 指定された question_id に紐づくチャットを取得
  const qChats = await prisma.questionChats.findMany({
    where: { 
      user_id: userId, 
      delete_flag: 0, 
      question_id: questionId 
    },
    orderBy: { created_at: 'asc' },
    include: { image: true }, 
  });

  // 2. image_id (number) の配列を抽出
  const imageIds = qChats
    .map(c => c.image_id)
    .filter((id): id is number => id !== null);

  // 3. IDベースの getImages を呼び出し（S3署名付きURLを取得）
  const urlMap = imageIds.length > 0 ? await getImages(imageIds) : new Map<number, string>();

  // 4. マッピングして返す
  return qChats.map((qChat) => ({
    ...qChat,
    signedImageUrl: qChat.image_id ? (urlMap.get(qChat.image_id) || null) : null
  }));
}

/**
 * 2. チャット投稿登録
 */
export async function registerQuestionChat(data: {
  questionId: number;
  userId: string;
  message?: string;
  imageUrl?: string;
  caption?: string;
  stamp?: string;
}, tx?: any) { // トランザクション対応
  const prismaClient = tx || prisma;

  let imageId: number | undefined;

  if (data.imageUrl) {
    const img = await prismaClient.image.findFirst({
      where: { storage_key: data.imageUrl }
    });
    
    // キャプションがあるなら画像を更新
    if (img && data.caption) {
      await prismaClient.image.update({
        where: { id: img.id },
        data: { caption: data.caption }
      });
    }
    imageId = img?.id;
  }

  return await prismaClient.questionChats.create({
    data: {
      question_id: data.questionId,
      user_id: data.userId,
      message: data.message,
      stamp: data.stamp,
      image_id: imageId,
      // 必要であれば追加カラム
    },
    include: { image: true }
  });
}
/**
 * 3. チャット編集更新
 */
export async function updateQuestionChat(chatId: number, questionId: number, userId: string, message: string) {
  
  const result = await prisma.questionChats.update({
    where: { 
      id: chatId, 
      question_id: questionId, 
      user_id: userId, 
      delete_flag: 0 },
    data: { message: message, updated_at: new Date() },
  });
  return result;
}



/**
 * 4. 単体削除 (画像削除含む)
 */
export async function deleteQuestionChat(chatId: number, questionId: number, userId: string): Promise<boolean> {
  const chat = await prisma.questionChats.findFirst({ 
    where: { id: chatId, question_id: questionId, user_id: userId, delete_flag: 0 },
    include: { image: true }
  });

  if (!chat) return false;

  await prisma.questionChats.update({
    where: {
      id: chatId,
      question_id: questionId, // ★ここが問題！
      user_id: userId,
      delete_flag: 0
    },
    data: { delete_flag: 1 },
  });

  if (chat.image) {
    try {
      await deleteImage(chat.image.storage_key);
      await prisma.image.update({
        where: { id: chat.image_id! },
        data: { delete_flag: 1 }
      });
    } catch (e) {
      console.error("画像削除失敗:", e);
    }
  }
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
    const chats = await db.questionChats.findMany({
      where: { id: { in: ids }, question_id: questionId, user_id: userId },
      select: { image_id: true, image: { select: { storage_key: true } } }
    });

    const result = await db.questionChats.updateMany({
      where: { id: { in: ids }, question_id: questionId, user_id: userId, delete_flag: 0 },
      data: { delete_flag: 1 },
    });

    if (result.count > 0) {
      const imageIds = chats.map(c => c.image_id).filter((id): id is number => !!id);
      const storageKeys = chats.map(c => c.image?.storage_key).filter((key): key is string => !!key);
      
      // 画像削除とDB論理削除
      await Promise.all(storageKeys.map(key => deleteImage(key)));
      await db.image.updateMany({ where: { id: { in: imageIds } }, data: { delete_flag: 1 } });
    }
    return result.count > 0;
  } catch (e) {
    console.error("一括削除失敗:", e);
    return false;
  }
}