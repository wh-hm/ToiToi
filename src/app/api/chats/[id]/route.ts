import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { updateChat, deleteChat, getChatCheck } from "@/services/ChatService";
import { MESSAGES } from "@/constants/messages";
import { getSpaceCheck } from "@/services/SpaceService";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chatId = parseInt(id);

  // 1. 認証チェック
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const { message, space_id } = await request.json();

    const [isSpaceAlive, isChatAlive] = await Promise.all([
        getSpaceCheck(auth.user_id, space_id), // ※関数名が推測ですが合わせる
        getChatCheck(auth.user_id, space_id, chatId)
    ]);

    // スペースチェックの判定
    if (!isSpaceAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    }

    // チャットチェックの判定
    if (!isChatAlive) {
        return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });
    }
    
    // 2. 更新実行 (message をオブジェクトで渡す構成に統一)
    const updatedChat = await updateChat(chatId, parseInt(space_id), auth.user_id, message );

    if (!updatedChat) {
      return NextResponse.json({ message: MESSAGES.E2002("チャット内容") }, { status: 403 });
    }

    return NextResponse.json(updatedChat);
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2002("チャット内容") }, { status: 500 });
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
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  

  // 2. URLから space_id を取得
  const { searchParams } = new URL(request.url);
  const space_id = parseInt(searchParams.get("space_id") || "");

  if (isNaN(chatId) || isNaN(space_id)) {
    return NextResponse.json({ message: MESSAGES.E1008 }, { status: 400 });
  }

  try {
    
    // 3. 削除実行
    await deleteChat(chatId, auth.user_id, space_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ message: MESSAGES.E2001("チャット") }, { status: 500 });
  }
}