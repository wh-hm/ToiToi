import { prisma } from "@/lib/prisma";
import { deleteImage, getImages } from "./StorageService";
import { Prisma } from "@prisma/client";


// Prismaのトランザクション型（dbがどちらでもいいように）
type Tx = Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
/**
 * 1. 全メッセージ取得（署名付きURL変換対応版）
 */
export const getQuestionChats = async (question_id: number, user_id: string, tx?: Tx) => {
  const db = tx || prisma;

  // 質問の存在確認
  const questionExists = await db.question.findFirst({
    where: { id: question_id, delete_flag: 0, user_id: user_id },
  });

  if (!questionExists) {
    throw new Error("対象の質問が存在しないか、既に削除されています。");
  }

  // チャットデータ取得
  const chats = await db.questionChats.findMany({
    where: { question_id, delete_flag: 0, user_id: user_id },
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
  question_id: number,
  user_id: string,
  message?: string | null,
  image_url?: string | null,
  stamp?: string | null,
  tx?: Tx // ★トランザクション引数を追加
) {
  // tx があればそれを使用、なければ通常の prisma インスタンスを使用
  const db = tx || prisma;

  return await db.questionChats.create({
    data: {
      question_id: question_id,
      user_id: user_id,
      message: message,
      image_url: image_url,
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
export async function updateQuestionChat(id: number, question_id: number, user_id: string, message: string, tx?: Tx) {
  const db = tx || prisma;
  
  const result = await db.questionChats.updateMany({
    where: { id, question_id, user_id, delete_flag: 0 },
    data: { message, updated_at: new Date() },
  });

  if (result.count === 0) throw new Error("対象のチャットが存在しないか、権限がありません。");
  return await db.questionChats.findUnique({ where: { id } });
}

/**
 * 4. 単体削除 (画像削除含む)
 */
export async function deleteQuestionChat(id: number, question_id: number, user_id: string, tx?: Tx): Promise<boolean> {
  const db = tx || prisma;
  const chat = await db.questionChats.findFirst({ where: { id, question_id, user_id, delete_flag: 0 } });

  if (!chat) return false;
  if (chat.image_url) await deleteImage(chat.image_url);

  await db.questionChats.update({
    where: { id },
    data: { delete_flag: 1 },
  });
  return true;
}

/**
 * 5. 一括削除 (並列処理で高速化)
 */
export async function deleteQuestionChats(ids: number[], question_id: number, user_id: string, tx?: Tx): Promise<boolean> {
  if (!ids.length) return false;
  try {
    // 全ての削除処理を並列で実行
    await Promise.all(ids.map(id => deleteQuestionChat(id, question_id, user_id, tx)));
    return true;
  } catch (e) {
    console.error("一括削除失敗:", e);
    return false;
  }
}

/**
 * 6. いいね切り替え
 */
export async function toggleLike(id: number, question_id: number, user_id: string, tx?: Tx) {
  const db = tx || prisma;
  const chat = await db.questionChats.findFirst({ where: { id, question_id, delete_flag: 0, user_id } });
  if (!chat) throw new Error("対象が見つかりません。");

  return await db.questionChats.update({
    where: { id },
    data: { nice_flag: chat.nice_flag === 0 ? 1 : 0 },
  });
}

// import { prisma } from "@/lib/prisma";
// import { deleteImage } from "./StorageService";


// /**
//  * 1. 全メッセージ取得
//  */
// export const getQuestionChats = async (question_id: number, user_id: string, tx?: any): Promise<any[]> => {
//   try {
//     const db = tx || prisma;

//     const questionExists = await db.question.findFirst({
//       where: { id: question_id, delete_flag: 0, user_id: user_id },
//     });

//     if (!questionExists) {
//       throw new Error("対象の質問が存在しないか、既に削除されています。");
//     }

//     return await db.questionChats.findMany({
//       where: { question_id: question_id, delete_flag: 0, user_id: user_id },
//       orderBy: { created_at: 'asc' },
//     });
//   } catch (error) {
//     console.error(`question_id: ${question_id} のチャット取得中にエラーが発生しました:`, error);
//     throw error;
//   }
// };

// /**
//  * 2. チャット投稿登録
//  */
// export async function registerQuestionChat(
//   question_id: number,
//   user_id: string,
//   message: string | null,
//   image_url?: string | null,
//   stamp?: string | null
// ) {
//   if (typeof question_id !== 'number' || isNaN(question_id)) {
//     throw new Error("Invalid question_id");
//   }


//   return await prisma.questionChats.create({
//     data: {
//       question_id,
//       user_id,
//       message: message,
//       image_url,
//       stamp,
//       delete_flag: 0,
//       nice_flag: 0,
//       created_at: new Date(),
//     },
//   });
// }

// /**
//  * 3. チャット編集更新
//  */
// export async function updateQuestionChat(
//   id: number,
//   question_id: number,
//   user_id: string,
//   message: string,
//   tx?: any
// ): Promise<any> {
//   try {
//     const db = tx || prisma;

//     const result = await db.questionChats.updateMany({
//       where: { id, question_id, user_id, delete_flag: 0 },
//       data: { 
//         message: message,
//         updated_at: new Date() },
//     });

//     if (result.count === 0) {
//       throw new Error("対象のチャットメッセージが存在しないか、編集権限がありません。");
//     }

//     return await db.questionChats.findUnique({ where: { id } });
//   } catch (error) {
//     console.error(`chat_id: ${id} の更新中にエラーが発生しました:`, error);
//     throw error;
//   }
// }

// /**
//  * 4. 単体削除
//  */
// export async function deleteQuestionChat(
//   id: number,
//   question_id: number,
//   user_id: string,
//   tx?: any
// ): Promise<boolean> {
//   try {
//     const db = tx || prisma;
//     const chatRecord = await db.questionChats.findFirst({
//       where: { id, question_id, user_id, delete_flag: 0 },
//     });

//     if (!chatRecord) return false;

//     if (chatRecord.image_url) await deleteImage(chatRecord.image_url);

//     await db.questionChats.updateMany({
//       where: { id, question_id, user_id },
//       data: { delete_flag: 1 },
//     });

//     return true;
//   } catch (error) {
//     console.error(`chat_id: ${id} の削除中にエラーが発生しました:`, error);
//     return false;
//   }
// }

// /**
//  * 5. 一括削除
//  */
// export async function deleteQuestionChats(
//   ids: number[] | null,
//   question_id: number,
//   user_id: string,
//   tx?: any
// ): Promise<boolean> {
//   if (!ids || ids.length === 0) return false;

//   const db = tx || prisma;
//   try {
//     for (const id of ids) {
//       const isSuccess = await deleteQuestionChat(id, question_id, user_id, db);
//       if (!isSuccess) return false;
//     }
//     return true;
//   } catch (error) {
//     console.error(`一括削除中に例外が発生しました:`, error);
//     return false;
//   }
// }

// /**
//  * 6. いいね切り替え
//  */
// export async function toggleLike(id: number, question_id: number, user_id: string, tx?: any): Promise<any> {
//   const db = tx || prisma;
//   const chatRecord = await db.questionChats.findFirst({
//     where: { id, question_id, delete_flag: 0, user_id },
//   });

//   if (!chatRecord) throw new Error("対象が見つかりません。");

//   return await db.questionChats.update({
//     where: { id },
//     data: { nice_flag: chatRecord.nice_flag === 0 ? 1 : 0 },
//   });
// }

// /**
//  * 7. 画像URL一覧取得
//  */
// export async function getChatImagesUrl(user_id: string, tx?: any): Promise<string[]> {
//   const db = tx || prisma;
//   const chats = await db.questionChats.findMany({
//     where: { delete_flag: 0, image_url: { not: null } },
//     select: { image_url: true },
//   });
//   return chats.map((chat: any) => chat.image_url as string);
// }