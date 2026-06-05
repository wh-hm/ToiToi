import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { toggleFavorite, changeBackground } from "@/services/ChatService";
import { MESSAGES } from "@/constants/messages";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chatId = parseInt(id);

  // 1. 認証とユーザーID取得
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const { space_id } = body;
    const url = new URL(request.url);

    let updatedChat;

    // 2. パスによって処理を切り替え
    if (url.pathname.includes("/favorite")) {
      updatedChat = await toggleFavorite(chatId, space_id, auth.user_id, body.favorite_flag);
    } 
    else if (url.pathname.includes("/background")) {
      updatedChat = await changeBackground(chatId, space_id, auth.user_id, body.background);
    } 
    else {
      return NextResponse.json({ error: "無効なエンドポイントです" }, { status: 404 });
    }

    if (!updatedChat) {
      return NextResponse.json({ error: "更新失敗：権限がないかデータがありません" }, { status: 403 });
    }

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error("更新エラー:", error);
    return NextResponse.json({ error: MESSAGES.E2001("更新") }, { status: 500 });
  }
}