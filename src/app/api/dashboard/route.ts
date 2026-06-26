import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { getSpaces } from "@/services/SpaceService";
import { getTasksCount } from "@/services/TaskService";
import { MESSAGES } from "@/constants/messages";
import { getGoal, updateGoal } from "@/services/GoalService";
import { getLoginManagement } from "@/services/LoginManagementService";

// ==========================================
// 1. GET: ダッシュボード全体のデータ取得
// ==========================================
export async function GET() {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    // 1. スペース一覧 と スペースごとのタスク数配列 を取得
    const [allSpaces, tasksWithCounts, goal, login_management] = await Promise.all([
      getSpaces(auth.user_id),
      getTasksCount(auth.user_id), // これが { space_id, space_name, task_count } の配列
      getGoal(auth.user_id),
      getLoginManagement(auth.user_id)
    ]);

    // 2. スペースにタスク数を結合する（マージ処理）
    const spacesWithTaskCount = allSpaces.map(space => {
      const taskInfo = tasksWithCounts.find(t => t.space_id === space.id);
      return {
        ...space,
        task_count: taskInfo ? taskInfo.task_count : 0 // 見つからなければ0
      };
    });

    const tasksCount = tasksWithCounts.reduce((sum, t) => sum + (t.task_count || 0), 0);

    // 3. データの整形と統合
    const result = {
      spaces: {
        type1: spacesWithTaskCount.filter(s => s.space_type === 1),
        type2: spacesWithTaskCount
          .filter(s => s.space_type === 2)
          .map(s => ({
            ...s, 
            task_count: s.task_count 
          })),
          
        type3: spacesWithTaskCount.filter(s => s.space_type === 3),
      },
      goal,             // 目標データ
      login_management, // ログイン管理情報
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("データ取得エラー:", error);
    return NextResponse.json({ error: MESSAGES.E2001("データ取得") }, { status: 500 });
  }
} // ==========================================
// 2. POST: 今週の目標の登録・更新（強制保存版）
// ==========================================
import { prisma } from "@/lib/prisma"; 

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    
    // 現在のデータを一度取得する（反転させるため）
    const currentGoal = await prisma.goal.findUnique({
      where: { id: auth.user_id }
    });

    // 1. 「ステータス切り替えボタン」から呼ばれた場合の特別ルート
    if (body.toggleStatus) {
      const nextStatus = currentGoal?.status === 1 ? 0 : 1; // 1なら0、0なら1に反転
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 7);

      const savedGoal = await prisma.goal.upsert({
        where: { id: auth.user_id },
        update: { status: nextStatus, deleted_at: farFuture },
        create: { id: auth.user_id, content: "新しい目標", status: nextStatus, deleted_at: farFuture }
      });
      return NextResponse.json({ message: MESSAGES.S1001("目標の更新") });
    }

    // 2. 通常の編集モーダルから保存された場合のルート（既存のコード）
    const textContent = body.content || body.name || body.text || "";
    const finalContent = textContent.trim() !== "" ? textContent : "テスト目標";
    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 7); 

    const savedGoal = await prisma.goal.upsert({
      where: { id: auth.user_id },
      update: {
        content: finalContent,
        delete_flag: 0,
        deleted_at: farFuture,
      },
      create: {
        id: auth.user_id,
        content: finalContent,
        status: 0,
        delete_flag: 0,
        created_at: new Date(),
        deleted_at: farFuture,
      },
    });

    return NextResponse.json({ message: MESSAGES.S1001("目標") });
  } catch (error) {
    console.error("目標保存エラー:", error);
    return NextResponse.json({ error: MESSAGES.E2001("目標の保存") }, { status: 500 });
  }
}