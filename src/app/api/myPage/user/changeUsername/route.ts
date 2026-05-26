import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { updateUsername } from "@/services/UserService"; // 定義したServiceをインポート

export async function PATCH(request: NextRequest) {
  try {
    // 1. セッションチェック
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // 2. フロントから新しい名前を受け取る
    const body = await request.json();
    const { newName } = body;

    if (!newName || newName.trim() === "") {
      return NextResponse.json({ error: "ユーザー名を入力してください" }, { status: 400 });
    }

    // 3. ユーザー名更新を実行
    // ※session.user.idがgoogle_idとして使われている前提
    const success = await updateUsername(session.user.id, newName);

    if (!success) {
      return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ message: "ユーザー名を変更しました" });
  } catch (error) {
    console.error("ユーザー名更新エラー:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}