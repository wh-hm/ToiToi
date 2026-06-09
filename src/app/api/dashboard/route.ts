import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { getSpaces } from "@/services/SpaceService";
import { getTasksCount }from "@/services/TaskService";
import { MESSAGES } from "@/constants/messages";
import { getGoal } from "@/services/GoalService";
import { getLoginManagement } from "@/services/LoginManagementService";
export async function GET() {
  // 1. 認証ガード
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    // 2. 必要なデータをまとめて取得（Promise.all で並列実行して高速化）
    const [spaces, tasksCount, goal, login_management] = await Promise.all([
      getSpaces(auth.user_id),
      getTasksCount(auth.user_id),
      getGoal(auth.user_id),
      getLoginManagement(auth.user_id)
    ]);

    // 3. データの整形と統合
    const result = {
      spaces: {
        type1: spaces.filter(s => s.space_type === 1),
        type2: spaces.filter(s => s.space_type === 2),
        type3: spaces.filter(s => s.space_type === 3),
      },
      tasksCount, // 未完了タスクの合計件数など
      goal,       // 目標データ
      login_management, // ログイン管理情報
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("データ取得エラー:", error);
    return NextResponse.json({ error: MESSAGES.E2001("データ取得") }, { status: 500 });
  }
}