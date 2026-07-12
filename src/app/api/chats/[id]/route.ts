import { NextResponse, NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { updateChat, deleteChat, getChatCheck } from "@/services/ChatService";
import { MESSAGES } from "@/constants/messages";
import { getSpaceCheck } from "@/services/SpaceService";
import { Prisma } from "@prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const spaceId = Number(id);
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const { message, chatId } = await request.json();
    const chatIdNum = Number(chatId);

    // スペースとチャットの存在確認を並列実行
    const [isSpaceAlive, isChatAlive] = await Promise.all([
      getSpaceCheck(auth.user_id, spaceId),
      getChatCheck(auth.user_id, spaceId, chatIdNum)
    ]);

    if (!isSpaceAlive) return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    if (!isChatAlive) return NextResponse.json({ message: MESSAGES.E2005("チャット") }, { status: 404 });

    const updatedChat = await updateChat(chatIdNum, spaceId, auth.user_id, message);
    return NextResponse.json({ updatedChat, message: MESSAGES.S1002("チャット内容") });
    
  } catch (error) {
    console.error("PATCH Error:", error);
    return NextResponse.json({ message: MESSAGES.E2002("チャット内容") }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const spaceId = Number(id);
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  const chatId = Number(request.nextUrl.searchParams.get("chatId"));
  if (isNaN(chatId) || isNaN(spaceId)) return NextResponse.json({ message: MESSAGES.E1008 }, { status: 400 });

  try {
    // 削除前に存在チェック（既に削除済みなら404を返してあげるのが親切）
    const isAlive = await getChatCheck(auth.user_id, spaceId, chatId);
    if (!isAlive) return NextResponse.json({ message: MESSAGES.E2005("チャット") }, { status: 404 });

    await deleteChat(chatId, auth.user_id, spaceId);
    return NextResponse.json({ message: MESSAGES.S1003("チャット") });
    
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
       return NextResponse.json({ message: MESSAGES.E2005("チャット") }, { status: 404 });
    }
    console.error("DELETE Error:", error);
    return NextResponse.json({ message: MESSAGES.E2004("チャット") }, { status: 500 });
  }
}