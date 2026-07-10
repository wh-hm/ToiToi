import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { changeBackground } from "@/services/ChatService";
import { MESSAGES } from "@/constants/messages";
import { getSpaceCheck } from "@/services/SpaceService";
import { getChatCheck } from "@/services/ChatService";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const space_id = parseInt(id);


  // 1. 認証とユーザーID取得を共通化
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const { background, chat_id } = await request.json();

    const [isSpaceAlive, isChatAlive] = await Promise.all([
        getSpaceCheck(auth.user_id, space_id), // ※関数名が推測ですが合わせる
        getChatCheck(auth.user_id, space_id, chat_id)
    ]);

    // スペースチェックの判定
    if (!isSpaceAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    }

    // チャットチェックの判定
    if (!isChatAlive) {
        return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });
    }
    // 2. 背景変更を実行
    const updatedChat = await changeBackground(chat_id, space_id, auth.user_id, background);

    if (!updatedChat) {
      return NextResponse.json({ message: MESSAGES.E2001("背景色") }, { status: 403 });
    }

    return NextResponse.json(updatedChat);
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2001("背景色") }, { status: 500 });
  }
}

