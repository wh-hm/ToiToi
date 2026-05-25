import { prisma } from "@/lib/prisma";
import { Task } from "@prisma/client";

//全タスク取得
export const getTasks = async (id: string, space_id: number): Promise<Task[]> => {
    return await prisma.task.findMany({
        where: {
            user_id: id,
            delete_flag: 0, // ★ここが最重要！フラグが0のものだけ取ってくる
            space_id: space_id,
        },
    });
};

//タスクの新規作成
export const registerTask = async (data: {

    user_id: string;
    title: string;
    due_date: string;
    space_id: number;
    tag: number;
}) => {
    if (isNaN(data.space_id)) throw new Error("space_idが数値ではありません");

    return await prisma.task.create({
        data: {
            user_id: data.user_id,
            title: data.title,
            due_date: new Date(data.due_date),
            // space_id: data.space_id,
            status: 0, // 未完了
            tag: data?.tag,
            delete_flag: 0, // デフォルト0
            created_at: new Date(),
            space: {
                connect: { id: data.space_id }
            }
        },
    });
};


//タスクの編集
export const updateTask = async (
  id: number, // idを引数として受け取るのが一般的です
  data: {
    user_id: string;
    title: string;
    due_date: string;
    space_id: number;
    tag: number;
    status: number;
  }
) => {
  if (isNaN(data.space_id)) throw new Error("space_idが数値ではありません");

  return await prisma.task.update({
    where: { 
      id: id, // ここで更新対象のIDを指定
      user_id: data.user_id, // セキュリティ: 本人のタスクか確認
      space_id: data.space_id // セキュリティ: 指定スペース内か確認
    },
    data: {
      title: data.title,
      due_date: new Date(data.due_date),
      status: data.status,
      tag: data.tag,
    },
  });
}


//タスクの削除
export const deleteTask = async (id: number, userId: string, space_id: string) => {
  try {
    // まず存在確認と所有者確認を兼ねて取得
    const task = await prisma.task.findUnique({
      where: { 
      id: id, // ここで更新対象のIDを指定
      user_id: userId, // セキュリティ: 本人のタスクか確認
      space_id: Number(space_id) // セキュリティ: 指定スペース内か確認
    },
    });

    // タスクがない、または所有者が違う、またはスペースが違う場合は削除不可
    if (!task || task.user_id !== userId || task.space_id !== Number(space_id)) {
      return false;
    }

    // 更新実行
    await prisma.task.update({
      where: { id: Number(id) },
      data: { delete_flag: 1 },
    });
    return true;
  } catch (error) {
    console.error("★論理削除エラーの詳細:", error);
    return false;
  }
};

//完了・未完了の変更
export const updateStatusTask = async (id: number, data: any) => {
  return await prisma.task.update({
    where: { 
      id: id, // ここで更新対象のIDを指定
      user_id: data.user_id, // セキュリティ: 本人のタスクか確認
      space_id: data.space_id // セキュリティ: 指定スペース内か確認
    },
    data: {
      status: data.status, // ここを 0 または 1 に更新
    },
  });
};