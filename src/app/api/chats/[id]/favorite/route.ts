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
    const { chatId, favoriteFlag } = await request.json();

    // 1. バリデーション：お気に入りフラグが数値かチェック
    if (typeof favoriteFlag !== 'number' || ![0, 1].includes(favoriteFlag)) {
      return NextResponse.json({ message: MESSAGES.E1001("お気に入りフラグ") }, { status: 400 });
    }

    // 2. 存在確認
    const [isSpaceAlive, isChatAlive] = await Promise.all([
      getSpaceCheck(auth.user_id, spaceId),
      getChatCheck(auth.user_id, spaceId, chatId)
    ]);

    if (!isSpaceAlive) return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    if (!isChatAlive) return NextResponse.json({ message: MESSAGES.E2005("チャット") }, { status: 404 });

    // 3. 更新実行
    const updatedChat = await toggleFavorite(chatId, spaceId, auth.user_id, favoriteFlag);

    return NextResponse.json({ 
      updatedChat, 
      message: MESSAGES.S1002("お気に入り") 
    });

  } catch (error) {
    console.error("Favorite PATCH Error:", error);
    return NextResponse.json({ message: MESSAGES.E2001("お気に入り") }, { status: 500 });
  }
}