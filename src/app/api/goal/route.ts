// app/api/goal/route.ts
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { getGoal, updateGoal } from "@/services/GoalService";
import { MESSAGES } from "@/constants/messages";

const safeRegex = /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+$/;


// 1. 目標取得 (GET)
export async function GET() {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const goal = await getGoal(auth.user_id);
    return NextResponse.json(goal || { goal: "" });
  } catch (error) {
    console.error("目標取得エラー:", error);
    return NextResponse.json({ error: MESSAGES.E2001("目標取得") }, { status: 500 });
  }
}

// 2. 目標更新 (PATCH)
export async function PATCH(request: Request) {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { goal } = await request.json();

    // バリデーションチェック
    if (!goal) return NextResponse.json({ error: MESSAGES.E1001("目標") }, { status: 400 });
    if (goal.length > 50) return NextResponse.json({ error: MESSAGES.E1002("目標", 50) }, { status: 400 });
    
    // 不適切文字チェック
    if (safeRegex.test(goal)) {
      return NextResponse.json({ error: MESSAGES.E1003("目標", "記号") }, { status: 400 });
    }

    const updated = await updateGoal(auth.user_id, goal);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("目標更新エラー:", error);
    return NextResponse.json({ error: MESSAGES.E2001("目標更新") }, { status: 500 });
  }
}