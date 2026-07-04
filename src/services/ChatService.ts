import { prisma } from "@/lib/prisma";
import { Chat, Prisma } from "@prisma/client"; // PrismaClientは型としてはここには不要です
import type { PrismaClient } from "@prisma/client"; // 型としてだけインポート
import { deleteImage } from "./StorageService";

import { getImages } from "./StorageService";

// ここを修正：PrismaClientの型定義を正しく指定
type PrismaClientOrTransaction = 
  | Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">
  | Prisma.TransactionClient;


  export async function getChatsWithImages(user_id: string, space_id: number) {
  // 1. チャットデータを取得
  const chats = await getChats(user_id, space_id);

  // 2. チャットデータから image_url があるものだけ抽出
  const imageUrls = chats
    .map(chat => chat.image_url)
    .filter((url): url is string => url !== null && url !== ""); // null や空文字を除去

  // 3. R2 から署名付きURLのリストを取得
  const signedImageUrls = await getImages(imageUrls);

  // 4. チャットデータにURLをマッピングして返す（必要に応じて）
  return chats.map((chat, index) => ({
    ...chat,
    // 対応するURLをセット（画像がない場合は null になるように調整）
    signedImageUrl: chat.image_url ? signedImageUrls[imageUrls.indexOf(chat.image_url)] : null
  }));
}

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

export const registerChat = async (
  data: {
    user_id: string;
    space_id: number;
    message?: string;
    image_url?: string;
    stamp?: string;
  },
  tx:any
) => {
  const client = tx || prisma; // txがあればそれを使う
  return await client.chat.create({
    data: {
      user_id: data.user_id,
      message: data.message,
      image_url: data.image_url || null,
      stamp: data.stamp || null,
      space: { connect: { id: data.space_id } },
      delete_flag: 0,
      favorite_flag: 0,
      background: 0,
    },
  });
};
export const updateChat = async (
  chatId: number,
  space_id: number,
  userId: string,
  newMessage: string,
  tx?: PrismaClientOrTransaction // ここも tx を渡せるようにしておく
) => {
  const client = tx || prisma;
  return await client.chat.update({
    where: { id: chatId, space_id: space_id, user_id: userId },
    data: { 
      message: newMessage,
      updated_at: new Date()
    },
  });
}


// 以下、削除やフラグ変更系はそのまま
export const deleteChat = async (chatId: number, userId: string, space_id: number, tx?: any) => {
  try {
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) throw new Error("チャットが見つかりません");

    if (chat.image_url) {
      await deleteImage(chat.image_url);
    }
    const db = tx || prisma;

    return await db.chat.update({
      where: { id: chatId, space_id: space_id, user_id: userId },
      data: { delete_flag: 1 },
    });
  } catch (error) {
    throw error;
  }
};

export const toggleFavorite = async (chatId: number, space_id: number, userId: string, newFlag: number) => {
  try {
    return await prisma.chat.update({
      where: { id: chatId, space_id: space_id, user_id: userId },
      data: { favorite_flag: newFlag },
    });
  } catch (error) {
    throw error;
  }
};

export const changeBackground = async (chatId: number, space_id: number, userId: string, background: number) => {
  try {
    return await prisma.chat.update({
      where: { id: chatId, space_id: space_id, user_id: userId },
      data: { background: background },
    });
  } catch (error) {
    throw error;
  }
};


