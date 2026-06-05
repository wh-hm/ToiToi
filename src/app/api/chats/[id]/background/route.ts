import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { changeBackground } from "@/services/ChatService";
import { MESSAGES } from "@/constants/messages";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chatId = parseInt(id);

  // 1. 認証とユーザーID取得を共通化
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { background, space_id } = await request.json();

    // 2. 背景変更を実行
    const updatedChat = await changeBackground(chatId, space_id, auth.user_id, background);

    if (!updatedChat) {
      return NextResponse.json({ error: "更新失敗：権限がないかデータがありません" }, { status: 403 });
    }

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error("背景変更エラー:", error);
    return NextResponse.json({ error: MESSAGES.E2001("背景変更") }, { status: 500 });
  }
}