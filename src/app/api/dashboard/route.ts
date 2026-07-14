import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { getSpaces } from "@/services/SpaceService";
import { getTasksCount } from "@/services/TaskService";
import { MESSAGES } from "@/constants/messages";
import { getGoal} from "@/services/GoalService";
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

    const formatSpace = (s: any, countKey?: string, countValue?: number) => {
      return {
        id: String(s.id),
        name: s.name,
        spaceType: Number(s.space_type),        
        favoriteFlag: Number(s.favorite_flag ?? 0), 
        isArchived: Number(s.is_archived ?? 0),    
        ...(countKey ? { [countKey]: countValue ?? 0 } : {})
      };
    };

    const result = {
      spaces: {
        chat: allSpaces
        .filter(s => s.space_type === 1)
        .map(s => formatSpace(s)),
        task: allSpaces
          .filter(s => s.space_type === 2)
          .map(s => {
            const count = tasksWithCounts.find(t => t.space_id === s.id)?.task_count ?? 0;
            return formatSpace(s, "taskCount", count);
          }),
        question: allSpaces
          .filter(s => s.space_type === 3)
          .map(s => {
            const count = questionsWithCounts.find(q => q.space_id === s.id)?.question_count ?? 0;
            return formatSpace(s, "questionCount", count);
          }),
      },
      goal: goal ? {
        id: goal.id,
        content: goal.content,
        status: Number(goal.status ?? 0),
        createdAt: goal.created_at,
        deletedAt: goal.deleted_at,
        deleteFlag: goal.delete_flag
        } : null,
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