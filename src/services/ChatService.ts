import { prisma } from "@/lib/prisma";
import { Chat } from "@prisma/client";

//全チャット取得
export const getChats = async (id: string, space_id: number): Promise<Chat[]> => {
    return await prisma.chat.findMany({
        where: {
            user_id: id,
            delete_flag: 0,
            space_id: space_id,
        },
    });
};

//チャットの新規作成
export const registerChat = async (data: {
    user_id: string;
    space_id: number;
    message?: string;    // 本文（任意）
    image_url?: string;  // 画像パス（任意）
    stamp?: string;      // スタンプ（任意）
}) => {
    return await prisma.chat.create({
        data: {
            user_id: data.user_id,
            message: data.message || null,
            image_url: data.image_url || null,
            stamp: data.stamp || null,
            // 外部キー関係
            space: {
                connect: { id: data.space_id }
            },
            // デフォルト値が効かない場合のために明示的に指定
            created_at: new Date(),
            delete_flag: 0,
            favorite_flag: 0,
            background: 0,
        },
    });
};

//チャット編集(テキストのみ)
export const updateChat = async (
  chatId: number, 
  spaceId: number, 
  userId: string, 
  newMessage: string
) => {
    return await prisma.chat.update({
        where: { 
            id: chatId,
            space_id: spaceId, // セキュリティ：そのスペース内のデータか確認
            user_id: userId    // セキュリティ：本人の投稿か確認
        },
        data: {
            message: newMessage, // 変更したい内容
        },
    });
};
//チャット削除
export const deleteChat = async (chatId: number, userId: string, spaceId: number) => {
  // 3. 全て確認できたら、IDのみで安全に更新
  return await prisma.chat.update({
    where: { id: chatId,
            space_id: spaceId, // セキュリティ：そのスペース内のデータか確認
            user_id: userId  },
    data: { delete_flag: 1 }
  });
};

//お気に入り変更
export const toggleFavorite = async (chatId: number, spaceId: number, userId: string, newFlag: number) => {
    

    return await prisma.chat.update({
        where: { id: chatId,
            space_id: spaceId, // セキュリティ：そのスペース内のデータか確認
            user_id: userId  },
        data: { favorite_flag: newFlag }
    });
};

export const changeBackground = async (chatId: number, spaceId: number, userId: string, background: number) => {
    

    return await prisma.chat.update({
        where: { id: chatId,
            space_id: spaceId, // セキュリティ：そのスペース内のデータか確認
            user_id: userId  },
        data: { background: background }
    });
};