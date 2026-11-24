import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

/**
 * 期限が到来した未送信リマインドを送信済(is_sent: 1)に更新し、通知欄表示用の一覧を取得する
 * （is_sent: 0 を条件にすることで重複処理を防止）
 */
export async function getAndTriggerReminders(userId: string) {
  const now = new Date();

  // 1. 日時判定：現在時刻を過ぎた未送信リマインドを「送信済」に更新（重複防止）
  await prisma.reminder.updateMany({
    where: {
      user_id: userId,
      delete_flag: 0,
      status: 0,
      is_sent: 0,
      remind_at: {
        lte: now,
      },
    },
    data: {
      is_sent: 1,
    },
  });

  // 2. 通知欄に表示するリマインド一覧を取得
  return await prisma.reminder.findMany({
    where: {
      user_id: userId,
      delete_flag: 0,
      is_sent: 1,
      status: 0,
    },
    orderBy: {
      remind_at: "desc",
    },
  });
}

/**
 * リマインドの新規登録（単体登録用）
 */
export async function createReminder(data: {
  userId: string;
  taskId: number;
  remindAt: Date;
  content: string;
  spaceType?: number;
}) {
  const existing = await prisma.reminder.findFirst({
    where: {
      user_id: data.userId,
      task_id: data.taskId,
      remind_at: data.remindAt,
      delete_flag: 0,
    },
  });

  if (existing) {
    return existing;
  }

  return await prisma.reminder.create({
    data: {
      user_id: data.userId,
      task_id: data.taskId,
      remind_at: data.remindAt,
      content: data.content,
      space_type: data.spaceType ?? 2,
      is_sent: 0,
      status: 0,
      is_read: 0,
      delete_flag: 0,
    },
  });
}

/**
 * 詳細設計書ベース：リマインド一括登録（タスク登録トランザクション用）
 */
export async function registerReminder(
  userId: string,
  taskId: number,
  remindAts: Date[],
  contents: string[],
  tx?: DbClient
) {
  const client = tx ?? prisma;

  if (!remindAts || remindAts.length === 0) return [];

  const records = remindAts.map((remindAt, idx) => ({
    user_id: userId,
    task_id: taskId,
    remind_at: remindAt,
    content: contents[idx] ?? "タスクの期限が迫っています",
    space_type: 2,
    is_sent: 0,
    status: 0,
    is_read: 0,
    delete_flag: 0,
  }));

  return await client.reminder.createMany({
    data: records,
  });
}

/**
 * 詳細設計書ベース：リマインド更新（タスク更新トランザクション用）
 */
export async function updateReminders(
  userId: string,
  taskId: number,
  reminders: (string | Date)[],
  tx?: DbClient
) {
  const client = tx ?? prisma;

  // タスク名を取得して通知文言に反映
  const task = await client.task.findUnique({
    where: { id: taskId },
    select: { title: true },
  });
  const contentText = task?.title
    ? `タスク「${task.title}」の期限が迫っています`
    : "タスクの期限が迫っています";

  // 既存の未送信・有効リマインドを論理削除して再登録
  await client.reminder.updateMany({
    where: {
      user_id: userId,
      task_id: taskId,
      delete_flag: 0,
    },
    data: {
      delete_flag: 1,
    },
  });

  if (reminders.length === 0) return;

  await client.reminder.createMany({
    data: reminders.map((r) => ({
      user_id: userId,
      task_id: taskId,
      remind_at: new Date(r),
      content: contentText,
      space_type: 2,
      is_sent: 0,
      status: 0,
      is_read: 0,
      delete_flag: 0,
    })),
  });
}

/**
 * リマインドの既読・非表示（status）更新
 */
export async function updateReminderStatus(
  userId: string,
  reminderId: number,
  data: { status?: number; is_read?: number }
) {
  return await prisma.reminder.update({
    where: {
      id: reminderId,
      user_id: userId,
      delete_flag: 0,
    },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.is_read !== undefined && { is_read: data.is_read }),
    },
  });
}