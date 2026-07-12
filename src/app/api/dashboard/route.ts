import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { getSpaces } from "@/services/SpaceService";
import { getTasksCount } from "@/services/TaskService";
import { MESSAGES } from "@/constants/messages";
import { getGoal, updateGoal } from "@/services/GoalService";
import { getLoginManagement } from "@/services/LoginManagementService";
import { getQuestionsCount } from "@/services/QuestionService";

// ==========================================
// 1. GET: ダッシュボード全体のデータ取得
// ==========================================
export async function GET() {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const [allSpaces, tasksWithCounts, questionsWithCounts, goal, loginManagement] = await Promise.all([
      getSpaces(auth.user_id),
      getTasksCount(auth.user_id),
      getQuestionsCount(auth.user_id),
      getGoal(auth.user_id),
      getLoginManagement(auth.user_id)
    ]);

    const result = {
      spaces: {
        chat: allSpaces.filter(s => s.space_type === 1),
        task: allSpaces
          .filter(s => s.space_type === 2)
          .map(s => ({ ...s, taskCount: tasksWithCounts.find(t => t.space_id === s.id)?.task_count ?? 0 })),
        question: allSpaces
          .filter(s => s.space_type === 3)
          .map(s => ({ ...s, questionCount: questionsWithCounts.find(q => q.space_id === s.id)?.question_count ?? 0 })),
      },
      goal,
      loginManagement,
    };

    return NextResponse.json({ 
        ...result, 
        message: MESSAGES.S2001("ダッシュボードデータ") 
    }, { status: 200 });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ message: MESSAGES.E2003("データ取得") }, { status: 500 });
  }
}