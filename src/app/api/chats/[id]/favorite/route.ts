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
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

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
      return NextResponse.json({ message: MESSAGES.E2001("お気に入り") }, { status: 403 });
    }

    return NextResponse.json(updatedChat);
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2001("お気に入り") }, { status: 500 });
  }
}