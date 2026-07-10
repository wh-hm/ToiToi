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
  const spaceId = parseInt(id);

  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    // body に favorite_flag が含まれていることを前提にします
    const { chat_id, favorite_flag } = body;

    const [isSpaceAlive, isChatAlive] = await Promise.all([
        getSpaceCheck(auth.user_id, spaceId), // ※関数名が推測ですが合わせる
        getChatCheck(auth.user_id, spaceId, chat_id)
    ]);

    // スペースチェックの判定
    if (!isSpaceAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    }

    // チャットチェックの判定
    if (!isChatAlive) {
        return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });
    }


    // ★修正：ここで実際に toggleFavorite を呼び出す
    const updated_chat = await toggleFavorite(
      chat_id, 
      spaceId, 
      auth.user_id, 
      favorite_flag
    );

    if (!updated_chat) {
      return NextResponse.json({ message: MESSAGES.E2001("お気に入り") }, { status: 403 });
    }

    return NextResponse.json({updated_chat: updated_chat, message: MESSAGES.S1002("お気に入り") });
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2001("お気に入り") }, { status: 500 });
  }
}