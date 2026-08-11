import { prisma } from "@/lib/prisma";
import { Goal, Prisma } from "@prisma/client";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// プラグインの有効化
dayjs.extend(utc);
dayjs.extend(timezone);

// 常に日本時間（JST）を基準にする
const TIMEZONE = "Asia/Tokyo";

function getNextMondayOf(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  result.setDate(result.getDate() + diff);

  // ローカル時間の時分秒に頼らず、年・月・日をそのまま取り出す
  const year = result.getFullYear();
  const month = result.getMonth();
  const dayNum = result.getDate();

  // ★「日本時間の0時（UTCの前日15時）」として絶対にズレないDateオブジェクトを直接作る
  // 日本時間の 00:00 は、UTCだと 前日の 15:00 になります
  return new Date(Date.UTC(year, month, dayNum, -9, 0, 0, 0));
}
export type Tx = Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

// /**
//  * 💡 補助関数：次の月曜日の0:00を計算
//  */
// function getNextMondayOf(date: Date): Date {
//   const result = new Date(date);
//   const day = result.getDay();
//   const diff = day === 0 ? 1 : 8 - day;
//   result.setDate(result.getDate() + diff);
//   result.setHours(0, 0, 0, 0);
//   return result;
// }

export async function getGoal(userId: string): Promise<Goal | null> {
  const goal = await prisma.goal.findUnique({ where: { id: userId } });

  if (!goal || goal.delete_flag !== 0) return null;

  // 目標期限が過ぎている場合の自動リセット
  if (goal.deleted_at && goal.deleted_at < new Date()) {
    return await prisma.goal.update({
      where: { id: userId },
      data: { status: 0, deleted_at: getNextMondayOf(new Date()), content: null },
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
): Promise<Goal | null> {
  const db = tx || prisma;

  const existingGoal = await db.goal.findUnique({
    where: { id: userId },
  });

  if (existingGoal && existingGoal.delete_flag === 1) {
    return null;
  }
  return await db.goal.upsert({
    where: { id: userId },
    update: {
      content,
      status,
      delete_flag: deleteFlag,
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

export async function updateGoalStatus(userId: string, status: number, tx?: Tx): Promise<Goal | null> {
  const db = tx || prisma;

  const goal = await db.goal.findFirst({
    where: { 
      id: userId, 
      delete_flag: 0 
    }
  });

  if (!goal) {
    return null;
  }
  const updatedGoal = await db.goal.update({
    where: { 
      id: userId, 
      delete_flag: 0 
    },
    data: { status: status },
  });
  return updatedGoal;
}