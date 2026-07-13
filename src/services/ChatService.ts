import { prisma } from "@/lib/prisma";
import { Chat } from "@prisma/client";
import { deleteImage, getImages } from "./StorageService";
import { Prisma } from "@prisma/client";

export type Tx = Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;


// 1. チャット取得＋画像URL付与
export async function getChatsWithImages(userId: string, spaceId: number) {
  const chats = await prisma.chat.findMany({
    where: { user_id: userId, delete_flag: 0, space_id: spaceId },
    orderBy: { created_at: 'asc' },
    include: { image: true }, 
  });

  // 1. image_id (number) の配列を抽出
  const imageIds = chats
    .map(c => c.image_id)
    .filter((id): id is number => id !== null);
  // 2. IDベースの getImages を呼び出し
  const urlMap = imageIds.length > 0 ? await getImages(imageIds) : new Map<number, string>();
  // 3. マッピングして返す
  return chats.map((chat) => ({
    ...chat,
    signedImageUrl: chat.image_id ? (urlMap.get(chat.image_id) || null) : null
  }));
}

// 2. 存在チェック（!! で boolean に変換）
export const getChatCheck = async (userId: string, spaceId: number, chatId: number): Promise<boolean> => {
  const result = await prisma.chat.findFirst({
    where: { id: chatId, user_id: userId, delete_flag: 0, space_id: spaceId }
  });
  return !!result;
};

// 4. チャット登録
export async function registerChat(data: {
  userId: string;
  spaceId: number;
  message?: string;
  imageUrl?: string; // string (ファイル名) を受け取る
  caption?: string; 
  stamp?: string;
}, tx: Tx) {
  
  let imageId: number | undefined;

  if (data.imageUrl) {
    // 1. ファイル名から Image テーブルの ID を取得
    const img = await tx.image.findFirst({
      where: { storage_key: data.imageUrl }
    });
    // 2. キャプションがあるなら更新
    if (img && data.caption) {
      await tx.image.update({
        where: { id: img.id },
        data: { caption: data.caption }
      });
    }
    imageId = img?.id;
  }
  return await tx.chat.create({
    data: {
      user_id: data.userId,
      space_id: data.spaceId,
      message: data.message,
      stamp: data.stamp,
      image_id: imageId, // IDをセット！
      delete_flag: 0,
    },
    include: { image: true }
  });
}

// 5. チャット削除（画像削除エラーはキャッチして個別にログ出力）
export const deleteChat = async (chatId: number, userId: string, spaceId: number) => {
  const chat = await prisma.chat.findUnique({ 
    where: { id: chatId },
    include: { image: true } 
  });
  
  if (!chat || chat.user_id !== userId) throw new Error("チャットが見つからないか、権限がありません");

  const updatedChat = await prisma.chat.update({
    where: { id: chatId, user_id: userId, space_id: spaceId },
    data: { delete_flag: 1 },
  });

  // Imageテーブルのdelete_flagも更新、またはStorage側の削除を実行
  if (chat.image) {
    try {
      await deleteImage(chat.image.storage_key);
      await prisma.image.update({
        where: { id: chat.image_id! },
        data: { delete_flag: 1 }
      });
    } catch (e) {
      console.error(`画像削除に失敗しました: ${chat.image.storage_key}`, e);
    }
  }

  return updatedChat;
};

// 6. 更新・トグル系（戻り値を Chat に統一）
export const updateChat = async (chatId: number, spaceId: number, userId: string, newMessage: string): Promise<Chat> => {
  return await prisma.chat.update({
    where: { id: chatId, space_id: spaceId, user_id: userId },
    data: { message: newMessage, updated_at: new Date() },
  });
};

export const toggleFavorite = async (chatId: number, spaceId: number, userId: string, newFlag: number): Promise<Chat> => {
  return await prisma.chat.update({
    where: { id: chatId, space_id: spaceId, user_id: userId },
    data: { favorite_flag: newFlag },
  });
};
export const changeBackground = async (chatId: number, spaceId: number, userId: string, background: number) => {
    return await prisma.chat.update({
      where: { id: chatId, space_id: spaceId, user_id: userId },
      data: { background: background },
    });
};


