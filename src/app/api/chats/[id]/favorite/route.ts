import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { toggleFavorite } from "@/services/ChatService";
import { MESSAGES } from "@/constants/messages";
import { getSpaceCheck } from "@/services/SpaceService";
import { getChatCheck } from "@/services/ChatService";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const space_id = parseInt(id);

  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    // body に favorite_flag が含まれていることを前提にします
    const { chat_id, favorite_flag } = body;

    console.log(space_id);
    const isSpaceAlive = await getSpaceCheck(auth.user_id, space_id);
    if (!isSpaceAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    }

    const isChatAlive = await getChatCheck(auth.user_id, space_id, chat_id);

    if (!isChatAlive) {
        return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });
    }


    // ★修正：ここで実際に toggleFavorite を呼び出す
    const updatedChat = await toggleFavorite(
      chat_id, 
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