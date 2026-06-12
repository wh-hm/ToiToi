
import { prisma } from "@/lib/prisma";
import { Task } from "@prisma/client";


//概要：スペースに紐づく有効なタスク一覧を取得する
export async function getTasks(
  space_id: number,
  user_id: string
): Promise<Task[]> {
  try {
    // スペーステーブル（spaces）を検索し、引数のspace_idに紐づくレコードの所有者（user_id）が一致するか確認
    const space = await prisma.task.findFirst({
      where: {
        id: space_id,
      },
    });

    // 一致しない場合、または該当スペースが存在しない、あるいは削除済みの場合は空配列「[]」を返す
    if (!space || space.user_id !== user_id || space.delete_flag !== 0) {
      return [];
    }

    // タスク一覧の検索（findMany）、ソート条件
    const tasks = await prisma.task.findMany({
      where: {
        space_id: space_id,
        delete_flag: 0, // 削除されていない、有効なタスクのみを対象とする
      },
      orderBy: [
        { due_date: 'asc' },   // 期日（due_date）の昇順
        { created_at: 'desc' } // 登録日時（created_at）の降順等で並び替え
      ],
    });

    // 戻り値の判定：取得したタスクレコードの配列（存在しない場合は空配列「[]」）を返却
    return tasks as Task[];
  } catch (error) {
    // 例外処理：データベース接続エラー等の例外発生時は、呼び出し元にエラーをそのまま返す
    throw error;
  }
}


// 概要：タスクの登録
export async function registerTask(
  user_id: string,
  title: string,
  description: string | null | undefined,
  due_date: string, // YYYY-MM-DDの日付文字列
  space_id: number,
  tag: number,
  is_allday: number,
  priority: number
): Promise<Task> {
  try {
    // 引数チェック（バリデーション）：
    // 引数の space_id が有効な数値形式 (number) であるかチェックを行う
    if (typeof space_id !== 'number' || Number.isNaN(space_id)) {
      // 数値ではない（isNaN）場合は、処理を中断してエラーを発生させる
      throw new Error("space_idが数値ではありません");
    }

    // 関連スペースの紐付けとレコード登録（create）
    const newTask = await prisma.task.create({
      data: {
        user_id: user_id, // 引数の user_id
        title: title,     // 引数の title
        description: description, 
        // 引数の due_date を Date型（日付型）に変換して設定
        due_date: new Date(due_date), 
        status: 0,        // 初期値：未完了状態を固定設定
        tag: tag,         // 引数の tag
        is_allday: is_allday, // 引数の is_allday
        priority: priority,   // 引数の priority
        delete_flag: 0,   // 初期値：有効状態を固定設定
        created_at: new Date(), // システム現在日時（new Date()）を設定

        // Prismaのconnect機能を使い、スペースレコードとのリレーション（結合関係）を保持
        space: {
          connect: {
            id: space_id
          }
        }
      },
    });

    // 登録完了後、自動採番されたタスクID等を含む該当タスクレコード1件分の全データを返却する
    return newTask as Task;
  } catch (error) {
    // 例外処理：データベース接続エラー等の例外発生時は、呼び出し元にエラーをそのまま返す
    throw error;
  }
}

// 概要：タスクの削除（論理削除）
export async function deleteTask(
  id: number,
  user_id: string,
  space_id: number
): Promise<boolean> {
  try {
    const result = await prisma.task.updateMany({
      where: {
        id: id,            // 引数の id （数値型）
        user_id: user_id,  // 引数の user_id
        space_id: space_id, // 引数の space_id
        delete_flag: 0,    // 未削除の有効なタスクのみ
      },
      data: {
        delete_flag: 1, // 削除済み状態に変更
      },
    });

    // レコードの更新が正常に完了した場合は、成功の証として true を呼び出し元に返却する。
    // 対象レコードが存在しない（他人のタスク、または既に削除されている）場合は、更新が行われないため false を返却する。
    if (result.count > 0) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    // 例外処理：データベース接続エラー等の例外発生時は、呼び出し元（呼出元）にエラーをそのまま返し、画面側でのエラー表示処理に委ねる。
    throw error;
  }
}

// 概要：タスクの編集・更新
export async function updateTask(
  id: number,
  user_id: string,
  title: string,
  description: string | null | undefined,
  due_date: string, // YYYY-MM-DD等の日付文字列
  space_id: number,
  tag: number,
  is_allday: number,
  priority: number,
  status: number
): Promise<Task> {
  try {
    // 検索・更新条件（where句）に delete_flag: 0 も含めることで、有効なタスクのみを対象とする。
    const updatedTask = await prisma.task.update({
      where: {
        // Prismaの複合ユニーク制約がない場合、主キーである id をベースに、他条件をクリアしているかチェックします。
        // もし id 単体での検索が必須な場合は、事前に findFirst で条件チェックを行ってから update に進むアプローチも安全です。
        id: id,
        user_id: user_id,
        space_id: space_id,
        delete_flag: 0, // 有効なタスクのみを対象とする
      },
      data: {
        title: title,         // 引数の title
        description: description || null, // 未入力時は NULL を設定
        due_date: new Date(due_date),     // Date型に変換して設定
        status: status,       // 引数の status
        tag: tag,             // 引数の tag
        is_allday: is_allday, // 引数の is_allday
        priority: priority,   // 引数の priority
      },
    });

    // 変更内容が反映された最新の該当スペースレコード1件分（※設計書のタイポ、タスクレコードのこと）のデータを返却する。
    return updatedTask as Task;
  } catch (error) {
    throw error;
  }
}


// 概要：ステータスを未完了/完了に更新する
export async function updateStatusTask(
  id: number,
  space_id: number,
  user_id: string,
  status: number // 変更後の状態フラグ（0:未完了, 1:完了）
): Promise<Task> {
  try {
    const updatedTask = await prisma.task.update({
      where: {
        id: id,
        user_id: user_id,
        space_id: space_id,
        delete_flag: 0, // 削除されていない、有効なタスクのみを対象とする
      },
      data: {
        status: status, // 更新データ：引数の status
      },
    });

    // 更新完了後、ステータス変更が反映された最新のタスクレコード1件分のデータを呼び出し元へ返却する。
    return updatedTask as Task;
  } catch (error) {
    throw error;
  }
}


/**
 * 各スペースごとの未完了タスク件数を配列で取得する
 */
export async function getTasksCount(user_id: string) {
  // 1. まずユーザーの全スペースを取得
  const spaces = await prisma.space.findMany({
    where: {
      user_id: user_id,
      delete_flag: 0,
    },
    select: {
      id: true,
      name: true, // スペース名も取れるようにしておくのがおすすめ
    },
  });

  // 2. 各スペースについてタスクをカウント（並列処理で高速化）
  const result = await Promise.all(
    spaces.map(async (space) => {
      const count = await prisma.task.count({
        where: {
          user_id: user_id,
          space_id: space.id,
          status: 0,
          delete_flag: 0,
        },
      });
      
      return {
        space_id: space.id,
        space_name: space.name,
        task_count: count,
      };
    })
  );

  return result; // これが「配列」になります
}