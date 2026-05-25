import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/services/UserService";
import { toggleFavorite } from "@/services/ChatService";


export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chatId = parseInt(id);
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    const body = await request.json();
    const { favorite_flag, space_id } = body;
// 2. セッションとユーザー確認
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    const userId = await getUserId(session.user.id);
    if (!userId) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }
    // 2. フラグを更新
    const updatedChat = toggleFavorite(chatId, space_id, userId, favorite_flag);

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.error("お気に入り更新エラー:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}