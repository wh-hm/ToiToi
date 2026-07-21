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
    // 1. スペース一覧 と スペースごとのタスク数配列 を取得
    const [allSpaces, tasksWithCounts, questionsWithCounts, goal, login_management] = await Promise.all([
      getSpaces(auth.user_id),
      getTasksCount(auth.user_id), 
      getQuestionsCount(auth.user_id),
      getGoal(auth.user_id),
      getLoginManagement(auth.user_id)
    ]);

    // 2. スペースにタスク数を結合する（マージ処理）
    const spacesWithTaskCount = allSpaces.map(space => {
      const taskInfo = tasksWithCounts.find(t => t.space_id === space.id);
      return {
        ...space,
        taskCount: taskInfo ? taskInfo.task_count : 0 // 見つからなければ0
      };
    });

    const spacesWithQuestionCount = allSpaces.map(space => {
      const questionInfo = questionsWithCounts.find(t => t.space_id === space.id);
      return {
        ...space,
        questionCount: questionInfo ? questionInfo.question_count : 0 // 見つからなければ0
      };
    });

    // 3. データの整形と統合
    const result = {
      spaces: {
        chat: spacesWithTaskCount.filter(s => s.space_type === 1),
        task: spacesWithTaskCount
          .filter(s => s.space_type === 2)
          .map(s => ({
            ...s, 
            taskCount: s.taskCount 
        })),
        question: spacesWithQuestionCount
          .filter(s => s.space_type === 3)
          .map(s => ({
            ...s, 
            questionCount: s.questionCount 
        })),
      },
      goal: goal,             // 目標データ
      loginManagement: login_management, // ログイン管理情報
    };

    return NextResponse.json({ 
        ...result, 
        message: MESSAGES.S2001("ダッシュボードデータ") 
    }, { status: 200});
    
  } catch (error) {
    console.error("データ取得エラー:", error);
    return NextResponse.json({ message: MESSAGES.E2001("データ取得") }, { status: 500 });
  }
} 

