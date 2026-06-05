import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { updateChat, deleteChat } from "@/services/ChatService";
import { MESSAGES } from "@/constants/messages";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chatId = parseInt(id);

  // 1. 認証チェック
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { message, space_id } = await request.json();
    
    // 2. 更新実行 (message をオブジェクトで渡す構成に統一)
    const updatedChat = await updateChat(chatId, parseInt(space_id), auth.user_id, message );

    if (!updatedChat) {
      return NextResponse.json({ error: "更新失敗：権限がないかデータがありません" }, { status: 403 });
    }

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error("更新エラー:", error);
    return NextResponse.json({ error: MESSAGES.E2001("チャット") }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chatId = parseInt(id);

  // 1. 認証チェックを先に済ませる
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // 2. URLから space_id を取得
  const { searchParams } = new URL(request.url);
  const spaceId = parseInt(searchParams.get("space_id") || "");

  if (isNaN(chatId) || isNaN(spaceId)) {
    return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
  }

  try {
    // 3. 削除実行
    await deleteChat(chatId, auth.user_id, spaceId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("削除エラー:", error);
    return NextResponse.json({ error: MESSAGES.E2001("チャット") }, { status: 500 });
  }
}