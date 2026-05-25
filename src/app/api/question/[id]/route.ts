import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/services/UserService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { updateQuestion, deleteQuestion } from "@/services/QuestionService";
import Question from "@/app/question/[id]/page";

// ★関数名を PATCH に修正
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Promise型にする
) {
  try {

    // 1. params を await でアンラップする
    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "IDが無効です" }, { status: 400 });
    }

    // 1. セッションとユーザーIDの確認
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    const user_id = await getUserId(session.user.id);
    if (!user_id) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    // 2. IDとボディの取得
    if (isNaN(id)) {
      return NextResponse.json({ error: "IDが無効です" }, { status: 400 });
    }

    const body = await request.json();

    // 3. 更新処理の実行
    const updated = await updateQuestion(
      id,
      body.spaceId,
      body.title,
      body.is_resolved,
      user_id,
      body.question,
      body.tag,

    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error("タスク更新エラー:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    console.log("削除リクエスト受信:", { id, body }); // ★まずはここを見る
    // 1. セッションとユーザーIDの取得
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "認証なし" }, { status: 401 });
    
    const user_id = await getUserId(session.user.id);
    if (!user_id) return NextResponse.json({ error: "ユーザー不明" }, { status: 404 });
    // 2. リクエストボディから space_id を取得
    
    const spaceNum = parseInt(body.space_id);
    if (isNaN(spaceNum)) {
        return NextResponse.json({ error: "無効なスペースIDです" }, { status: 400 });
    }

    // 3. 論理削除の実行
    const success = await deleteQuestion(Number(id), user_id, spaceNum);
    if (!success) {
      return NextResponse.json({ error: "削除失敗または権限なし" }, { status: 404 });
    }

    return NextResponse.json({ message: "削除しました" });
  } catch (error) {
    console.error("【詳細なエラー発生】", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}