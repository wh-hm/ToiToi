import { prisma } from "@/lib/prisma";
import { Task } from "@prisma/client";

export const getTaskCheck = async (userId: string, spaceId: number, taskId: number): Promise<boolean> => {
  const result = await prisma.task.findFirst({
    where: { id: taskId, user_id: userId, space_id: spaceId }
  });
  return !!result && result.delete_flag === 0;
};

//概要：スペースに紐づく有効なタスク一覧を取得する
export async function getTasks(spaceId: number, userId: string): Promise<Task[]> {
  return await prisma.task.findMany({
    where: {
      space_id: spaceId,
      delete_flag: 0,
      space: { user_id: userId, delete_flag: 0 } // リレーション条件をここに統合
    },
    orderBy: [{ due_date: 'asc' }, { created_at: 'desc' }],
  });
}

// 概要：タスクの登録
export async function registerTask(
  userId: string, title: string, description: string | null | undefined,
  dueDate: string, spaceId: number, tag: number, isAllday: number, priority: number
): Promise<Task> {
  return await prisma.task.create({
    data: {
      user_id: userId, title, description,
      due_date: new Date(dueDate), 
      status: 0, tag, is_allday: isAllday, priority, delete_flag: 0,
      space: { connect: { id: spaceId } }
    },
  });
}

// 概要：タスクの削除（論理削除）
export async function deleteTask(taskId: number, userId: string, spaceId: number): Promise<boolean> {
  const result = await prisma.task.updateMany({
    where: { id: taskId, user_id: userId, space_id: spaceId, delete_flag: 0 },
    data: { delete_flag: 1 },
  });
  return result.count > 0;
}

// 概要：タスクの編集・更新
export async function updateTask(
  taskId: number, userId: string, title: string, description: string | null | undefined,
  dueDate: string, spaceId: number, tag: number, isAllday: number, priority: number, status: number
): Promise<Task> {
  return await prisma.task.update({
    where: { id: taskId, user_id: userId, space_id: spaceId, delete_flag: 0 },
    data: {
      title,
      description: description || null,
      due_date: dueDate,
      status, tag, is_allday: isAllday, priority,
    },
  });
}

// 概要：ステータスを未完了/完了に更新する
export async function updateStatusTask(taskId: number, spaceId: number, userId: string, status: number): Promise<Task> {
  return await prisma.task.update({
    where: { id: taskId, user_id: userId, space_id: spaceId, delete_flag: 0 },
    data: { status },
  });
}

/**
 * 各スペースごとの未完了タスク件数を配列で取得する
 */
export async function getTasksCount(userId: string) {
  const [taskCounts, spaces] = await Promise.all([
    prisma.task.groupBy({
      by: ['space_id'],
      where: { user_id: userId, status: 0, delete_flag: 0 },
      _count: { id: true },
    }),
    prisma.space.findMany({
      where: { user_id: userId, delete_flag: 0 },
      select: { id: true, name: true },
    })
  ]);

  return spaces.map((space) => ({
    space_id: space.id,
    space_name: space.name,
    task_count: taskCounts.find((t) => t.space_id === space.id)?._count.id ?? 0,
  }));
}