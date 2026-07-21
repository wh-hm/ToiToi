import { prisma } from "@/lib/prisma";
import { Space } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { deleteImages } from "./StorageService";

export type Tx = Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

const SPACE_TYPE_MAP: Record<number, string> = {
  1: "CHAT",
  2: "TASK",
  3: "QUESTION",
};

// 概要：ユーザーに紐づく有効なスペース一覧を取得する
export async function getSpaces(
  userId: string,
  isArchived?: number | null,
  spaceType?: number | null
): Promise<Space[]> {
  return await prisma.space.findMany({
    where: {
      user_id: userId,
      delete_flag: 0,
      ...(isArchived != null && { is_archived: isArchived }),
      ...(spaceType != null && { space_type: spaceType }),
    },
  });
}

//スペースが生きているかどうかの確認
export async function getSpaceCheck(userId: string, spaceId: number): Promise<boolean> {
  const space = await prisma.space.findFirst({
    where: { user_id: userId, id: spaceId },
  });
  return !!space && space.delete_flag === 0;
}

//スペース名取得
export async function getSpaceName(userId: string, spaceId: number): Promise<string> {
  const space = await prisma.space.findFirst({
    where: { user_id: userId, id: spaceId, delete_flag: 0 },
  });
  if (!space) throw new Error("指定されたスペースが見つかりません。");
  return space.name;
}

// 概要：スペースの登録
export async function registerSpace(
  userId: string, name: string, spaceType: number, favoriteFlag: number, isArchived: number
): Promise<Space> {
  return await prisma.space.create({
    data: { user_id: userId, name, space_type: spaceType, delete_flag: 0, favorite_flag: favoriteFlag, is_archived: isArchived },
  });
}

// 概要：スペースの変更
export async function updateSpace(
  id: number, name: string, userId: string, favoriteFlag?: number | null, isArchived?: number | null
): Promise<Space> {
  return await prisma.space.update({
    where: { id, user_id: userId, delete_flag: 0 },
    data: {
      name,
      ...(favoriteFlag != null && { favorite_flag: favoriteFlag }),
      ...(isArchived != null && { is_archived: isArchived }),
    },
  });
}

// 概要：スペース削除（論理削除）
export async function deleteSpace(
  spaceId: number, spaceType: string, userId: string, tx?: Tx
): Promise<boolean> {
  const db = tx || prisma;
  
  if (spaceType === 'CHAT') await deleteSpaceChat(spaceId, userId, db);
  else if (spaceType === 'TASK') await deleteSpaceTask(spaceId, userId, db);
  else if (spaceType === 'QUESTION') await deleteSpaceQuestion(spaceId, userId, db);

  await db.space.update({
    where: { id: spaceId },
    data: { delete_flag: 1 },
  });
  return true;
}

// 概要：スペース一括削除、質問一括削除、チャット一括削除、タスク一括削除
export async function deleteSpaces(userId: string, spaceType: string): Promise<boolean> {
  const typeMapping: Record<string, number> = { "CHAT": 1, "TASK": 2, "QUESTION": 3 };

  const whereClause: Prisma.SpaceWhereInput = {
    user_id: userId,
    delete_flag: 0,
    ...(spaceType !== "ALL" && { space_type: typeMapping[spaceType] }),
  };

  const spaces = await prisma.space.findMany({ where: whereClause, select: { id: true, space_type: true } });
  if (spaces.length === 0) {
    return false;
  }

  let allImageIds: number[] = [];

  try {
    allImageIds = await prisma.$transaction(async (tx) => {
      let imageIdsCollector: number[] = [];

      for (const space of spaces) {
        const stringType = spaceType === "ALL" 
          ? (Object.keys(typeMapping).find(k => typeMapping[k] === space.space_type) || "UNKNOWN")
          : spaceType;

        if (stringType === 'CHAT') {
          const chats = await tx.chat.findMany({
            where: { space_id: space.id, user_id: userId, delete_flag: 0 },
            select: { id: true, image_id: true }
          });
          const imgIds = chats.map(c => c.image_id).filter((id): id is number => id !== null);
          imageIdsCollector.push(...imgIds);

          if (chats.length > 0) {
            await tx.chat.updateMany({
              where: { id: { in: chats.map(c => c.id) } },
              data: { delete_flag: 1 }
            });
          }
        } else if (stringType === 'TASK') {
          await tx.task.updateMany({
            where: { space_id: space.id, user_id: userId, delete_flag: 0 },
            data: { delete_flag: 1 },
          });
        } else if (stringType === 'QUESTION') {
          const questions = await tx.question.findMany({
            where: { space_id: space.id, user_id: userId, delete_flag: 0 },
            select: { id: true }
          });
          if (questions.length > 0) {
            const qIds = questions.map(q => q.id);
            const questionChats = await tx.questionChats.findMany({
              where: { question_id: { in: qIds } },
              select: { image_id: true }
            });
            const imgIds = questionChats.map(c => c.image_id).filter((id): id is number => id !== null);
            imageIdsCollector.push(...imgIds);

            await tx.question.updateMany({ where: { id: { in: qIds } }, data: { delete_flag: 1 } });
            await tx.questionChats.updateMany({ where: { question_id: { in: qIds } }, data: { delete_flag: 1 } });
          }
        }

        await tx.space.update({
          where: { id: space.id },
          data: { delete_flag: 1 },
        });
      }

      return imageIdsCollector;
    });
  } catch (error) {
    console.error("一括削除トランザクションエラー:", error);
    return false;
  }

  if (allImageIds.length > 0) {
    try {
      await deleteImages(allImageIds);
    } catch (storageError) {
      console.error("ストレージ画像の削除に失敗しました:", storageError);
    }
  }

  return true;
}

// 概要：スペースチャット一括削除
export async function deleteSpaceChat(spaceId: number, userId: string, tx?: Tx): Promise<boolean> {
  const db = tx || prisma;
  
  const chats = await db.chat.findMany({
    where: { space_id: spaceId, user_id: userId, delete_flag: 0 },
    select: { id: true, image_id: true }
  });

  if (chats.length === 0) return true;

  const imageIds = chats.map(c => c.image_id).filter((id): id is number => id !== null);
  console.log("写真の枚数", imageIds);

  if (imageIds.length > 0) {
    await deleteImages(imageIds); 
  }

  await db.chat.updateMany({
    where: { id: { in: chats.map(c => c.id) } },
    data: { delete_flag: 1 }
  });

  return true;
}

export async function deleteSpaceTask(spaceId: number, userId: string, tx?: Tx): Promise<boolean> {
  const db = tx || prisma;

  await db.task.updateMany({
    where: { space_id: spaceId, user_id: userId, delete_flag: 0 },
    data: { delete_flag: 1 },
  });
  return true;
}

export async function deleteSpaceQuestion(spaceId: number, userId: string, tx?: Tx): Promise<boolean> {
  const db = tx || prisma;
  
  const questions = await db.question.findMany({
    where: { space_id: spaceId, user_id: userId, delete_flag: 0 },
    select: { id: true }
  });
  if (questions.length === 0) return true;

  const qIds = questions.map(q => q.id);
  const questionChats = await db.questionChats.findMany({
    where: { question_id: { in: qIds } },
    select: { image_id: true }
  });
  const imageIds = questionChats.map(c => c.image_id).filter((id): id is number => id !== null);

  if (imageIds.length > 0) {
    await deleteImages(imageIds); 
  }

  await db.question.updateMany({ where: { id: { in: qIds } }, data: { delete_flag: 1 } });
  await db.questionChats.updateMany({ where: { question_id: { in: qIds } }, data: { delete_flag: 1 } });
  
  return true;
}

/**
 * メソッド名称：deleteArchives
 * 概要：アーカイブ一括削除
 */
export async function deleteArchives(userId: string, tx?: Tx): Promise<boolean> {
  const db = tx || prisma;
  const archivedSpaces = await getSpaces(userId, 1, null);

  if (archivedSpaces.length === 0) {
    return false;
  }

  try {
    await db.$transaction(async (innerTx) => {
      for (const space of archivedSpaces) {
        const typeString = SPACE_TYPE_MAP[space.space_type] || "UNKNOWN";
        await deleteSpace(space.id, typeString, userId, innerTx);
      }
    });
  } catch (error) {
    console.error("アーカイブ一括削除トランザクションエラー:", error);
    return false;
  }

  return true;
}