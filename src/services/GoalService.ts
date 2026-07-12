import { prisma } from "@/lib/prisma";
import { Goal, Prisma } from "@prisma/client";

export type Tx = Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/**
 * 💡 補助関数：次の月曜日の0:00を計算
 */
function getNextMondayOf(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export async function getGoal(userId: string): Promise<Goal | null> {
  const goal = await prisma.goal.findUnique({ where: { id: userId } });

  if (!goal || goal.delete_flag !== 0) return null;

  // 目標期限が過ぎている場合の自動リセット
  if (goal.deleted_at && goal.deleted_at < new Date()) {
    return await prisma.goal.update({
      where: { id: userId },
      data: { status: 0, deleted_at: getNextMondayOf(new Date()) },
    });
  }
  return goal;
}

export async function registerGoal(userId: string, content: string, tx: Tx): Promise<Goal> {
  return await tx.goal.create({
    data: {
      id: userId,
      content,
      status: 0,
      delete_flag: 0,
      deleted_at: getNextMondayOf(new Date()),
    },
  });
}

export async function updateGoal(
  userId: string, content: string, status?: number, deleteFlag?: number, tx?: Tx
): Promise<Goal> {
  const db = tx || prisma;
  return await db.goal.upsert({
    where: { id: userId },
    update: {
      content,
      status,
      delete_flag: deleteFlag,
      deleted_at: getNextMondayOf(new Date()),
    },
    create: {
      id: userId,
      content,
      status: 0,
      delete_flag: 0,
      deleted_at: getNextMondayOf(new Date()),
    },
  });
}

export async function deleteGoal(userId: string, tx?: Tx): Promise<Goal> {
  const db = tx || prisma;
  return await db.goal.update({
    where: { id: userId },
    data: { delete_flag: 1, content: "", status: 0 },
  });
}

export async function updateGoalStatus(userId: string, status: number, tx?: Tx): Promise<Goal> {
  const db = tx || prisma;
  return await db.goal.update({
    where: { id: userId },
    data: { status },
  });
}