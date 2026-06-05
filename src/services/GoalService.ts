import { prisma } from "@/lib/prisma";
import { Goal } from "@prisma/client";


/**
 * メソッド名称：getGoal
 * 概要：ユーザーに紐づく有効な目標管理情報を取得する
 */
export async function getGoal(user_id: string): Promise<Goal | null> {
  try {
    // 1. 目標管理マスタから上記条件に一致するレコードを1件検索（findUnique）する。
    // ※設計書に従い、user_id が主キー（PK、テーブル上の物理名id）にマッピングされているため id を指定。
    const goal = await prisma.goal.findUnique({
      where: {
        id: user_id,
      },
    });

    // レコードが存在しない、または論理削除済みの場合は null を呼び出し元へ返却する。
    if (!goal || goal.delete_flag !== 0) {
      return null;
    }

    // 3. .deleted_at が現在の日時よりも過去の場合、updateGoalを実行し、contentをnullにする（自動リセット）
    if (goal.deleted_at && goal.deleted_at < new Date()) {
      // 期限切れのため自動リセット処理を呼び出す（ステータスは既存維持、または仕様に合わせて調整）
      const resetGoal = await updateGoal(user_id, "", goal.status);
      return resetGoal;
    }

    // レコードが存在する場合はそのオブジェクトを返し、存在しない場合はnullを返す（上記でチェック済）
    return goal as Goal;
  } catch (error) {
    // 例外処理：データベース接続エラー等の例外発生時は、呼び出し元にエラーをそのまま返し、画面側でのエラー表示ハンドリングに委ねる。
    throw error;
  }
}

/**
 * メソッド名称：registerGoal
 * 概要：ユーザーの目標内容を新規に登録する
 */
export async function registerGoal(user_id: string, content: string): Promise<Goal> {
  try {
    // 登録データマッピング
    const newGoal = await prisma.goal.create({
      data: {
        id: user_id,       // user_id を主キー（PK）として直接マッピング
        content: content,   // 引数の content
        status: 0,         // デフォルト値：未達成状態を明示的に設定
        delete_flag: 0,    // デフォルト値：フラグなし（有効）を明示的に設定
        created_at: new Date(), // 自動設定された作成日時（created_at）
        deleted_at: getNextMondayOf(new Date()), // 初回登録時も次の月曜日に設定する仕様の場合
      },
    });

    // 登録完了後、自動設定された作成日時等が反映されたレコード1件分の全データを返却する。
    return newGoal as Goal;
  } catch (error) {
    // 例外処理：同一の user_id で既にレコードが存在している（一意性制約エラー）場合や、DBエラーが発生した場合は、呼び出し元にエラーをそのまま返す。
    throw error;
  }
}

/**
 * メソッド名称：deleteGoal
 * 概要：設定されている目標を削除する（論理削除）
 * 備考：tx（トランザクション）を受け取れるように拡張
 */
export async function deleteGoal(user_id: string, tx?: any): Promise<Goal> {
  try {
    // tx があればそれを使用し、なければ通常の prisma インスタンスを使用する
    const db = tx || prisma;

    const updatedGoal = await db.goal.update({
      where: {
        id: user_id,
        delete_flag: 0,
      },
      data: {
        delete_flag: 1, // 削除フラグを1:削除済みに更新する
      },
    });

    // 戻り値：更新されたレコードオブジェクトを返却
    return updatedGoal;
  } catch (error) {
    // 例外処理：呼び出し元にエラーをそのまま返す
    throw error;
  }
}

/**
 * メソッド名称：updateGoal
 * 概要：設定済みの目標内容、または目標達成状況（ステータス）を更新する
 */
export async function updateGoal(
  user_id: string,
  content: string | null,
  status?: number | null,
  delete_flag?: number | null
): Promise<Goal> {
  try {
    // 1. 現行レコードの取得
    const currentGoal = await prisma.goal.findFirst({
      where: {
        id: user_id,
        delete_flag: 0,
      },
    });

    if (!currentGoal) {
      throw new Error("更新対象の目標データが見つかりません");
    }

    // 2. リセット日時・更新処理の割り振り
    let nextDeletedAt: Date | undefined = undefined;
    let targetContent: any = content;

    // 設計書「① リセット日時の設定：引数の content が空文字（""）等の場合、deleted_atを次の月曜日の0:00に設定」
    if (content === "") {
    targetContent = { set: null }; // 👈 ここ！単なる null ではなく { set: null } を指定
    nextDeletedAt = getNextMondayOf(new Date());
    } else if (content === null) {
    targetContent = { set: null }; // 👈 引数が null の場合も同様に指定
    }

    const updatedGoal = await prisma.goal.update({
      where: {
        id: user_id,
      },
      data: {
        content: targetContent,
        ...(status !== undefined && status !== null ? { status: status } : {}),
        ...(delete_flag !== undefined && delete_flag !== null ? { delete_flag: delete_flag } : {}),
        ...(nextDeletedAt ? { deleted_at: nextDeletedAt } : {}),
      },
    });

    // 3. 戻り値の返却：更新完了後、最新のレコードデータを呼び出し元へ返却する。
    return updatedGoal as Goal;
  } catch (error) {
    // 例外処理：同一の user_id で既にレコードが存在している（一意性制約エラー）場合や、DBエラーが発生した場合は、呼び出し元にエラーをそのまま返す。
    throw error;
  }
}

/**
 * 💡 補助関数：指定された日時の「次の月曜日の0:00」を計算して返す
 */
function getNextMondayOf(date: Date): Date {
  const resultDate = new Date(date.getTime());
  // 次の月曜日までの日数を計算 (日曜:0, 月曜:1, ..., 土曜:6)
  const currentDay = resultDate.getDay();
  const daysUntilMonday = currentDay === 0 ? 1 : 8 - currentDay;
  
  resultDate.setDate(resultDate.getDate() + daysUntilMonday);
  resultDate.setHours(0, 0, 0, 0); // 時刻を00:00:00.000にリセット
  return resultDate;
}