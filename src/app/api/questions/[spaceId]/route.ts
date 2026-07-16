import { NextRequest, NextResponse } from "next/server";
import { updateQuestion, deleteQuestion, updateQuestionStatus} from "@/services/QuestionService"; 
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";
import { getSpaceCheck } from "@/services/SpaceService";
import { checkQuestion } from "@/services/QuestionService";

// 1. PATCH: 更新（解決フラグ切り替え / フル編集）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const { spaceId } = await params;
    const spaceIdNum = Number(spaceId);
    const { title, question, tag, questionId, isResolved } = await request.json();

    const questionIdNum = Number(questionId);
    if (!questionIdNum) {
      return NextResponse.json({ message: "質問IDが不足しています" }, { status: 400 });
    }

    // 存在確認を先行
    const [isSpaceAlive, isQuestionAlive] = await Promise.all([
      getSpaceCheck(auth.user_id, spaceIdNum),
      checkQuestion(auth.user_id, spaceIdNum, questionId)
    ]);

    if (!isSpaceAlive) return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    if (!isQuestionAlive) return NextResponse.json({ message: MESSAGES.E2005("質問") }, { status: 404 });

    // ケースA: 解決ステータスのみ更新
    if (isResolved !== undefined && !title && !question) {
      const updated = await updateQuestionStatus(questionId, spaceIdNum, auth.user_id, isResolved);
      return NextResponse.json({ question: updated, message: MESSAGES.S1002("質問ステータス") });
    }

    // ケースB: フル更新
    if (!title?.trim() || !question?.trim()) {
      return NextResponse.json({ message: MESSAGES.E1001("必須項目") }, { status: 400 });
    }
    
    const updated = await updateQuestion(
      questionIdNum, spaceIdNum, auth.user_id, title, question, isResolved ?? 0, tag ? Number(tag) : null
    );

    return NextResponse.json({ question: updated, message: MESSAGES.S1002("質問") });

  } catch (error) {
    console.error("PATCH Question Error:", error);
    return NextResponse.json({ message: MESSAGES.E2002("質問") }, { status: 500 });
  }
}

// 2. DELETE: 削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const { spaceId } = await params;
    const spaceIdNum = Number(spaceId);
    const questionId = Number(request.nextUrl.searchParams.get("questionId"));

    // 存在確認を行ってから削除
    const isAlive = await checkQuestion(auth.user_id, spaceIdNum, questionId);
    if (!isAlive) return NextResponse.json({ message: MESSAGES.E2005("質問") }, { status: 404 });

    await deleteQuestion(questionId, spaceIdNum, auth.user_id);
    return NextResponse.json({ success: true, message: MESSAGES.S1003("質問") });
    
  } catch (error) {
    console.error("DELETE Question Error:", error);
    return NextResponse.json({ message: MESSAGES.E2004("質問") }, { status: 500 });
  }
}