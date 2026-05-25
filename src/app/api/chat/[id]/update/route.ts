import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserId } from "@/services/UserService";
import { updateChat } from "@/services/ChatService";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chatId = parseInt(id);

  try {
    // 1. リクエストボディの受け取り
    const body = await request.json();
    const { message, space_id } = body; // フロントから message と space_id を受け取る

    // 2. セッションとユーザー確認
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    const userId = await getUserId(session.user.id);
    if (!userId) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    
    // 3. データの更新
    // updateChat 関数で space_id を使って整合性をチェックする設計に合わせます
    const updatedChat = await updateChat(
      chatId,
      parseInt(space_id), // Bodyから受け取ったスペースID
      userId,             // 取得したユーザーID
      message
    );
    console.log("デバッグ: chatId=", chatId, "space_id=", space_id, "userId=", userId);
console.log("更新結果:", updatedChat); // これが null ならどこかで弾かれています

    if (!updatedChat) {
      return NextResponse.json({ error: "更新失敗：権限がないかデータがありません" }, { status: 403 });
    }

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error("更新エラー:", error);
    return NextResponse.json({ error: "サーバー内部エラー" }, { status: 500 });
  }
}