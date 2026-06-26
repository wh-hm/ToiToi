import { NextRequest, NextResponse } from "next/server";
import { updateQuestion, deleteQuestion, updateQuestionStatus} from "@/services/QuestionService"; 
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";

// 1. PATCH: 質問または解決ステータスの更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const questionId = Number(id);
    const body = await request.json();

    const { title, question, tag } = body;
    const spaceId = Number(body.spaceId || body.space_id);
    const is_resolved = body.is_resolved !== undefined ? Number(body.is_resolved) : (body.status !== undefined ? Number(body.status) : undefined);

    if (!spaceId || isNaN(spaceId)) {
      return NextResponse.json({ message: MESSAGES.E1001("スペースID") }, { status: 400 });
    }

    if (!title && !question && is_resolved !== undefined) {
      const updatedStatus = await updateQuestionStatus(
        questionId,
        spaceId,
        auth.user_id, // ⚠️ サービス側の仕様に合わせ作成者IDを渡します
        is_resolved
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
      spaceId,
      auth.user_id,
      title,
      question,
      is_resolved !== undefined ? is_resolved : 0,
      tag ? Number(tag) : null
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("質問更新中にエラーが発生しました:", error);
    return NextResponse.json({ message: error.message || MESSAGES.E2002("質問") }, { status: 500 });
  }
}

// 2. DELETE: 質問削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const spaceId = Number(searchParams.get("space_id"));

    if (!spaceId || isNaN(spaceId)) {
      return NextResponse.json({ error: MESSAGES.E1001("スペースID") }, { status: 400 });
    }

    const success = await deleteQuestion(Number(id), spaceId, auth.user_id);
    if (!success) return NextResponse.json({ error: MESSAGES.E2004("質問") }, { status: 500 });

    return NextResponse.json({ message: MESSAGES.S1003("質問") });
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2004("質問") }, { status: 500 });
  }
}