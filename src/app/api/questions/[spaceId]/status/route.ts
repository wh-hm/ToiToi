import { NextRequest, NextResponse } from "next/server";
import { updateQuestionStatus } from "@/services/QuestionService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";
import { getSpaceCheck } from "@/services/SpaceService";
import { checkQuestion } from "@/services/QuestionService";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  // 認証ガードを適用
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const { spaceId } = await params;
    const body = await request.json();
    const { isResolved, questionId } = body;
    const spaceIdNum = Number(spaceId);
    const questionIdNum = Number(questionId);

    // バリデーションチェック
    if (
      isNaN(questionIdNum) || 
      isNaN(spaceIdNum) || 
      ![0, 1].includes(Number(isResolved))
    ) {
      return NextResponse.json(
        { message: MESSAGES.E1001("必須パラメータ") }, 
        { status: 400 }
      );
    }
    const [isSpaceAlive,  isQuestionAlive] = await Promise.all([
      getSpaceCheck(auth.user_id, spaceIdNum), // ※関数名が推測ですが合わせる
      checkQuestion(auth.user_id, spaceIdNum, questionIdNum),
    ]);
        
    // スペースチェックの判定
    if (!isSpaceAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    }
    if (!isQuestionAlive) {
        return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });
    }

    // 更新処理
    const updatedQuestion = await updateQuestionStatus(questionIdNum, spaceIdNum, auth.user_id, isResolved);

    if (!updatedQuestion) {
      return NextResponse.json({ message: MESSAGES.E2002("質問ステータス") }, { status: 500 });
    }

    return NextResponse.json({ 
        question: updatedQuestion, 
        message: MESSAGES.S1002("質問ステータス") 
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2002("質問ステータス") }, { status: 500 });
  }
}