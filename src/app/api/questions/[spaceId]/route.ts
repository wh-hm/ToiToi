import { NextRequest, NextResponse } from "next/server";
import { updateQuestion, deleteQuestion, updateQuestionStatus} from "@/services/QuestionService"; 
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";
import { getSpaceCheck } from "@/services/SpaceService";
import { checkQuestion } from "@/services/QuestionService";

// 1. PATCH: 質問または解決ステータスの更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const { spaceId } = await params;
    const body = await request.json();

    const { title, question, tag, questionId, isResolved } = body;
    const spaceIdNum = Number(spaceId);

    if (!spaceIdNum || isNaN(spaceIdNum)) {
      return NextResponse.json({ message: MESSAGES.E1001("スペースID") }, { status: 400 });
    }
    const [isSpaceAlive,  isQuestionAlive] = await Promise.all([
      getSpaceCheck(auth.user_id, spaceIdNum), // ※関数名が推測ですが合わせる
      checkQuestion(auth.user_id, spaceIdNum, questionId),
    ]);
        
    // スペースチェックの判定
    if (!isSpaceAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    }
    if (!isQuestionAlive) {
        return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });
    }

    if (!title && !question && isResolved !== undefined) {
      const updatedStatus = await updateQuestionStatus(
        questionId,
        spaceIdNum,
        auth.user_id, // ⚠️ サービス側の仕様に合わせ作成者IDを渡します
        isResolved
      );
      return NextResponse.json(updatedStatus);
    }

    // 💡【ケース2】通常の編集画面からのフル更新（ここから下は必須チェックを行う）
    // --- 単体チェック ---
    if (!title) return NextResponse.json({ message: MESSAGES.E1001("質問タイトル") }, { status: 400 });
    if (!question) return NextResponse.json({ message: MESSAGES.E1001("質問詳細") }, { status: 400 });

    // 桁数チェック
    if (title.length > 50) return NextResponse.json({ message: MESSAGES.E1002("質問タイトル", 50) }, { status: 400 });
    if (question.length > 100) return NextResponse.json({ message: MESSAGES.E1002("質問詳細", 100) }, { status: 400 });

    const updated = await updateQuestion(
      questionId,
      spaceIdNum,
      auth.user_id,
      title,
      question,
      isResolved !== undefined ? isResolved : 0,
      tag ? Number(tag) : null
    );

    return NextResponse.json({ 
        question: updated, 
        message: MESSAGES.S1002("質問") 
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: MESSAGES.E2002("質問") }, { status: 500 });
  }
}

// 2. DELETE: 質問削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const { spaceId } = await params;
    const { searchParams } = new URL(request.url);
    const questionId = Number(searchParams.get("questionId"));
    const spaceIdNum = Number(spaceId);


    if (!spaceId || isNaN(spaceIdNum)) {
      return NextResponse.json({ message: MESSAGES.E1001("スペースID") }, { status: 400 });
    }

    const success = await deleteQuestion(questionId, spaceIdNum, auth.user_id);
    if (!success) return NextResponse.json({ message: MESSAGES.E2004("質問") }, { status: 500 });

    return NextResponse.json({ 
        success: true, 
        message: MESSAGES.S1003("質問") 
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2004("質問") }, { status: 500 });
  }
}