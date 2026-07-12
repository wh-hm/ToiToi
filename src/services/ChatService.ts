import { prisma } from "@/lib/prisma";
import { Chat } from "@prisma/client";
import { deleteImage, getImages } from "./StorageService";

// 1. チャット取得＋画像URL付与
export async function getChatsWithImages(userId: string, spaceId: number): Promise<(Chat & { signedImageUrl: string | null })[]> {
  const chats = await getChats(userId, spaceId);

  const imageUrls = chats
    .map(c => c.image_url)
    .filter((url): url is string => !!url);

  const signedImageUrls = imageUrls.length > 0 ? await getImages(imageUrls) : [];
  const urlMap = new Map(imageUrls.map((url, i) => [url, signedImageUrls[i]]));

  return chats.map((chat) => ({
    ...chat,
    signedImageUrl: chat.image_url ? (urlMap.get(chat.image_url) || null) : null
  }));
}

// 2. 存在チェック（!! で boolean に変換）
export const getChatCheck = async (userId: string, spaceId: number, chatId: number): Promise<boolean> => {
  const result = await prisma.chat.findFirst({
    where: { id: chatId, user_id: userId, delete_flag: 0, space_id: spaceId }
  });
  return !!result;
};

// 3. 一覧取得
export const getChats = async (userId: string, spaceId: number): Promise<Chat[]> => {
  return await prisma.chat.findMany({
    where: { user_id: userId, delete_flag: 0, space_id: spaceId },
    orderBy: { created_at: 'asc' },
  });
};

// 4. チャット登録
export const registerChat = async (data: {
  userId: string; spaceId: number; message?: string; imageUrl?: string; stamp?: string;
}): Promise<Chat> => {
  return await prisma.chat.create({
    data: {
      user_id: data.userId,
      message: data.message ?? null,
      image_url: data.imageUrl ?? null,
      stamp: data.stamp ?? null,
      space: { connect: { id: data.spaceId } },
      delete_flag: 0,
      favorite_flag: 0,
      background: 0,
    },
  });
};

// 5. チャット削除（画像削除エラーはキャッチして個別にログ出力）
export const deleteChat = async (chatId: number, userId: string, spaceId: number): Promise<Chat> => {
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  if (!chat || chat.user_id !== userId) throw new Error("チャットが見つからないか、権限がありません");

  const updatedChat = await prisma.chat.update({
    where: { id: chatId, space_id: spaceId, user_id: userId },
    data: { delete_flag: 1 },
  });

  if (updatedChat.image_url) {
    try {
      await deleteImage(updatedChat.image_url);
    } catch (e) {
      console.error(`画像削除に失敗しました: ${updatedChat.image_url}`, e);
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


