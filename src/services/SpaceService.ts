import { prisma } from "@/lib/prisma";
import { Space } from "@prisma/client";

//全スペース取得
export const getSpaces = async (id: string): Promise<Space[]> => {
    return await prisma.space.findMany({
        where: {
            user_id: id,
            delete_flag: 0, // ★ここが最重要！フラグが0のものだけ取ってくる
        },
    });
};

//スペースの新規作成
export const registerSpace = async (
    id: string,         // user_id
    name: string,
    space_type: number
): Promise<boolean> => {
    try {
        await prisma.space.create({
        data: {
            user_id: id,
            name: name,
            space_type: space_type,
        },
        });
        return true;
    } catch (error) {
        console.error("スペース登録エラー:", error);
        return false;
    }
};

// スペース名の編集
export const updateSpace = async (spaceId: string, name: string, userId: string) => {
    return await prisma.space.update({
        where: { 
        id: Number(spaceId),
        user_id: userId,
        },
        data: { name },
    });
};

// スペースの削除
export const deleteSpace = async (
    id: string, 
    userId: string, 
): Promise<boolean> => {
    try {
        const updated = await prisma.space.update({
        where: { 
            id: Number(id),
            user_id: userId, // 所有者チェック
        },
        data: { 
            delete_flag: 1 
        },
        });
        
        // 更新が成功した（データが見つかった）か確認
        return !!updated;
    } catch (error) {
        console.error("論理削除エラー:", error);
        return false; // 戻り値を bool に合わせる
    }
};

//お気に入りの変更
// src/services/SpaceService.ts
export const toggleFavorite = async (id: string, userId: string) => {
    const space = await prisma.space.findUnique({
        where: { id: Number(id) }
    });

    // 存在確認と所有者チェック
    if (!space || space.user_id !== userId) return null;

    // 0なら1へ、1なら0へ
    const newFavoriteFlag = space.favorite_flag === 1 ? 0 : 1;

    return await prisma.space.update({
        where: { id: Number(id) },
        data: { favorite_flag: newFavoriteFlag }
    });
};