import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/services/UserService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { updateTask, deleteTask } from "@/services/TaskService";

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
    const updated = await updateTask(id, {
      user_id: user_id,
      title: body.title,
      due_date: body.due_date,
      space_id: parseInt(body.space_id), // ボディから取得
      tag: body.tag,
      status: body.status,
    });

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
    // ※ 削除時に space_id がボディに入っている前提です

    // 3. 論理削除の実行
    const success = await deleteTask(Number(id), user_id, body.space_id.toString());

    if (!success) {
      return NextResponse.json({ error: "削除失敗または権限なし" }, { status: 404 });
    }

    return NextResponse.json({ message: "削除しました" });
  } catch (error) {
    console.error("【詳細なエラー発生】", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}