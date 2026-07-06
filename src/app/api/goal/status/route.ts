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

    const goal = await updateGoalStatus(
      auth.user_id,
      Number(status)
    );

    return NextResponse.json(goal);
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