import { prisma } from "@/lib/prisma";
import { Space } from "@prisma/client";

// --- 基本機能 ---

export const getSpaces = async (id: string): Promise<Space[]> => {
    return await prisma.space.findMany({
        where: { user_id: id, delete_flag: 0 },
    });
};

export const registerSpace = async (id: string, name: string, space_type: number): Promise<boolean> => {
    try {
        await prisma.space.create({
            data: { user_id: id, name: name, space_type: space_type },
        });
        return true;
    } catch (error) {
        console.error("スペース登録エラー:", error);
        return false;
    }
};

export const updateSpace = async (spaceId: string, name: string, userId: string) => {
    return await prisma.space.update({
        where: { id: Number(spaceId), user_id: userId },
        data: { name },
    });
};

export const deleteSpace = async (id: string, userId: string): Promise<boolean> => {
    try {
        const updated = await prisma.space.update({
            where: { id: Number(id), user_id: userId },
            data: { delete_flag: 1 },
        });
        return !!updated;
    } catch (error) {
        console.error("論理削除エラー:", error);
        return false;
    }
};

export const toggleFavorite = async (id: string, userId: string) => {
    const space = await prisma.space.findUnique({ where: { id: Number(id) } });
    if (!space || space.user_id !== userId) return null;
    const newFavoriteFlag = space.favorite_flag === 1 ? 0 : 1;
    return await prisma.space.update({
        where: { id: Number(id) },
        data: { favorite_flag: newFavoriteFlag }
    });
};

// --- 削除系ロジック (tx引数対応版) ---

// チャット削除
export const deleteSpaceChats = async (tx: any = prisma,userId: string): Promise<boolean> => {
    const targetSpaces = await tx.space.findMany({
        where: { space_type: 1, user_id: userId, delete_flag: 0 },
        select: { id: true }
    });
    const spaceIds = targetSpaces.map((s: any) => s.id);
    if (spaceIds.length === 0) return false;

    await tx.chat.updateMany({ where: { space_id: { in: spaceIds } }, data: { delete_flag: 1 } });
    await tx.space.updateMany({ where: { id: { in: spaceIds } }, data: { delete_flag: 1 } });
    return true;
};

// タスク削除
export const deleteSpaceTasks = async (tx: any = prisma, userId: string): Promise<boolean> => {
    const targetSpaces = await tx.space.findMany({
        where: { space_type: 2, user_id: userId, delete_flag: 0 },
        select: { id: true }
    });
    const spaceIds = targetSpaces.map((s: any) => s.id);
    if (spaceIds.length === 0) return false;

    await tx.task.updateMany({ where: { space_id: { in: spaceIds } }, data: { delete_flag: 1 } });
    await tx.space.updateMany({ where: { id: { in: spaceIds } }, data: { delete_flag: 1 } });
    return true;
};

// 質問削除
export const deleteSpaceQuestions = async (tx: any = prisma, userId: string, ): Promise<boolean> => {
    const targetSpaces = await tx.space.findMany({
        where: { space_type: 3, user_id: userId, delete_flag: 0 },
        select: { id: true }
    });
    const spaceIds = targetSpaces.map((s: any) => s.id);
    if (spaceIds.length === 0) return false;

    const questions = await tx.question.findMany({ where: { space_id: { in: spaceIds } }, select: { id: true } });
    const questionIds = questions.map((q: any) => q.id);

    if (questionIds.length > 0) {
        await tx.questionChats.updateMany({ where: { question_id: { in: questionIds } }, data: { delete_flag: 1 } });
        await tx.question.updateMany({ where: { id: { in: questionIds } }, data: { delete_flag: 1 } });
    }
    await tx.space.updateMany({ where: { id: { in: spaceIds } }, data: { delete_flag: 1 } });
    return true;
};



export const deleteSpaces = async (userId: string, tx: any): Promise<boolean> => {
    // 1. スペースIDを取得
    const spaces = await tx.space.findMany({
        where: { user_id: userId, delete_flag: 0 },
        select: { id: true },
    });
    
    if (spaces.length === 0) return true;
    const spaceIds = spaces.map((s: any) => s.id);

    // 2. 新しいトランザクションは作らず、受け取った tx をそのまま使う
    await deleteSpaceChats(tx, userId);
    await deleteSpaceQuestions(tx, userId);
    await deleteSpaceTasks(tx, userId);

    // 3. スペース自体を削除
    await tx.space.updateMany({
        where: { id: { in: spaceIds } },
        data: { delete_flag: 1 },
    });

    return true;
};