import { prisma } from "@/lib/prisma";
import { Chat } from "@prisma/client";
import { deleteImage } from "./StorageService";


export const getChats = async (user_id: string, space_id: number): Promise<Chat[]> => {
  try {
    return await prisma.chat.findMany({
      where: { user_id, delete_flag: 0, space_id },
      orderBy: {
        created_at: 'asc',
      },
    });
  } catch (error) {
    throw error;
  }
};

export const registerChat = async (data: {
  user_id: string;
  space_id: number;
  message?: string;
  image_url?: string;
  stamp?: string;
}) => {
  try {

    return await prisma.chat.create({
      data: {
        user_id: data.user_id,
        message: data.message, // サニタイズされたテキストを保存
        image_url: data.image_url || null,
        stamp: data.stamp || null,
        space: { connect: { id: data.space_id } },
        delete_flag: 0,
        favorite_flag: 0,
        background: 0,
      },
    });
  } catch (error) {
    throw error;
  }
};

export const updateChat = async (
  chatId: number,
  spaceId: number,
  userId: string,
  newMessage: string
) => {
  try {

    return await prisma.chat.update({
      where: { id: chatId, space_id: spaceId, user_id: userId },
      data: { 
        message: newMessage,
        updated_at: new Date()
      }, // サニタイズされたテキストで更新
    });
  } catch (error) {
    throw error;
  }
};

// 以下、削除やフラグ変更系はそのまま
export const deleteChat = async (chatId: number, userId: string, spaceId: number) => {
  try {
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) throw new Error("チャットが見つかりません");

    if (chat.image_url) {
      await deleteImage(chat.image_url);
    }

    return await prisma.chat.update({
      where: { id: chatId, space_id: spaceId, user_id: userId },
      data: { delete_flag: 1 },
    });
  } catch (error) {
    throw error;
  }
};

export const toggleFavorite = async (chatId: number, spaceId: number, userId: string, newFlag: number) => {
  try {
    return await prisma.chat.update({
      where: { id: chatId, space_id: spaceId, user_id: userId },
      data: { favorite_flag: newFlag },
    });
  } catch (error) {
    throw error;
  }
};

export const changeBackground = async (chatId: number, spaceId: number, userId: string, background: number) => {
  try {
    return await prisma.chat.update({
      where: { id: chatId, space_id: spaceId, user_id: userId },
      data: { background: background },
    });
  } catch (error) {
    throw error;
  }
};


