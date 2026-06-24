import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { toggleFavorite } from "@/services/ChatService";
import { MESSAGES } from "@/constants/messages";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chatId = parseInt(id);

  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    // body に favorite_flag が含まれていることを前提にします
    const { space_id, favorite_flag } = body;

    // ★修正：ここで実際に toggleFavorite を呼び出す
    const updatedChat = await toggleFavorite(
      chatId, 
      space_id, 
      auth.user_id, 
      favorite_flag
    );

    if (!updatedChat) {
      return NextResponse.json({ error: "更新失敗：権限がないかデータがありません" }, { status: 403 });
    }

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error("更新エラー:", error);
    return NextResponse.json({ error: MESSAGES.E2001("更新") }, { status: 500 });
  }
}