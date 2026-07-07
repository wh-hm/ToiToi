import { NextRequest, NextResponse } from "next/server";
import { updateQuestionStatus } from "@/services/QuestionService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 認証ガードを適用
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const body = await request.json();
    const { is_resolved, space_id } = body;

    const question_id = Number(id);
    const spaceId = Number(space_id);
    const isResolved = Number(is_resolved);

    // バリデーションチェック
    if (isNaN(question_id) || isNaN(spaceId) || isNaN(isResolved)) {
      return NextResponse.json(
        { message: MESSAGES.E1001("必須パラメータ") }, 
        { status: 400 }
      );
    }

    // 更新処理
    const success = await updateQuestionStatus(question_id, spaceId, auth.user_id, isResolved);

    if (!success) {
      return NextResponse.json({ message: MESSAGES.E2002("質問ステータス") }, { status: 500 });
    }

    return NextResponse.json({ message: MESSAGES.S1002("質問ステータス") });
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2002("質問ステータス") }, { status: 500 });
  }
}