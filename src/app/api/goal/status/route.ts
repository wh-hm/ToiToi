import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { updateGoalStatus } from "@/services/GoalService";
import { MESSAGES } from "@/constants/messages";

export async function PATCH(request: NextRequest) {
  const auth = await getAuthContext();

  if ("error" in auth) {
    return NextResponse.json(
      { message: auth.error },
      { status: auth.status }
    );
  }
  try {
    const { status } = await request.json();

    // 必須チェック
    if (status === undefined || ![0, 1].includes(Number(status))) {
      return NextResponse.json(
        { message: MESSAGES.E1001("目標ステータス") },
        { status: 400 }
      );
    }

    const updatedGoal = await updateGoalStatus(
      auth.user_id,
      Number(status)
    );

    if (!updatedGoal) {
      return NextResponse.json(
        { message: MESSAGES.E2005("目標") }, 
        { status: 404 }
      );
    }

    return NextResponse.json({ 
        updatedGoal: updatedGoal, 
        message: MESSAGES.S1002("目標ステータス") 
    }, { status: 200 });
  } catch (error) {
    console.error("目標ステータス更新エラー:", error);

    return NextResponse.json(
      {
        message: MESSAGES.E2002("目標ステータス"),
      },
      {
        status: 500,
      }
    );
  }
}