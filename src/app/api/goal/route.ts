import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";
import { updateGoal } from "@/services/GoalService";

const safeRegex =
  /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF01-\uFF5E]/;

export async function PATCH(request: Request) {
  // 認証
  const auth = await getAuthContext();
  if ('error' in auth) {
        return NextResponse.json({ message: auth.error, code: auth.code }, { status: auth.status },);
  }

  try {
    const { content } = await request.json();

    // 必須チェック
    if (!content || !content.trim()) {
      return NextResponse.json(
        { message: MESSAGES.E1001("目標") },
        { status: 400 }
      );
    }

    // 文字数
    if (content.length > 100) {
      return NextResponse.json(
        { message: MESSAGES.E1002("目標", 100) },
        { status: 400 }
      );
    }
    // 使用禁止文字
    if (safeRegex.test(content)) {
      return NextResponse.json(
        { message: MESSAGES.E1003("目標", "使用できない文字") },
        { status: 400 }
      );
    }


    const goal = await updateGoal(auth.user_id, content);
    if(!goal){
      return NextResponse.json(
        { message: MESSAGES.E2007, code: "USER_DELETED" }, 
        { status: 403 }
      );
    }

    return NextResponse.json({ 
        goal: goal, 
        message: MESSAGES.S1002("目標"),
    }, { status: 200 });
  } catch (error) {
    console.error("目標更新エラー:", error);

    return NextResponse.json(
      {
        message: MESSAGES.E2002("目標"),
      },
      { status: 500 }
    );
  }
}