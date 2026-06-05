import { NextRequest, NextResponse } from "next/server";
import { updateQuestion, deleteQuestion } from "@/services/QuestionService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";


// 1. PATCH: 質問更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const questionId = Number(id);
    const { title, question, spaceId, is_resolved, tag } = await request.json();

    // --- 単体チェック ---
    // 必須チェック
    if (!title) return NextResponse.json({ error: MESSAGES.E1001("質問タイトル") }, { status: 400 });
    if (!question) return NextResponse.json({ error: MESSAGES.E1001("質問詳細") }, { status: 400 });

    // 桁数チェック
    if (title.length > 50) return NextResponse.json({ error: MESSAGES.E1002("質問タイトル", 50) }, { status: 400 });
    if (question.length > 100) return NextResponse.json({ error: MESSAGES.E1002("質問詳細", 100) }, { status: 400 });


    const updated = await updateQuestion(
      questionId,
      spaceId,
      title,
      is_resolved,
      auth.user_id,
      question,
      tag
    );

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: MESSAGES.E2002("質問") }, { status: 500 });
  }
}

// 2. DELETE: 質問削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    // DELETEメソッドではボディを読み取らない設計を推奨
    const { searchParams } = new URL(request.url);
    const spaceId = Number(searchParams.get("space_id"));

    if (!spaceId || isNaN(spaceId)) {
      return NextResponse.json({ error: MESSAGES.E1001("スペースID") }, { status: 400 });
    }

    const success = await deleteQuestion(Number(id), spaceId, auth.user_id);
    if (!success) return NextResponse.json({ error: MESSAGES.E2004("質問") }, { status: 500 });

    return NextResponse.json({ message: MESSAGES.S1003("質問") });
  } catch (error) {
    return NextResponse.json({ error: MESSAGES.E2004("質問") }, { status: 500 });
  }
}