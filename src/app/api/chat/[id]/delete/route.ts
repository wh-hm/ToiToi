import { prisma } from "@/lib/prisma"; // 適宜パスは調整してください
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/services/UserService"
import { getServerSession } from "next-auth"; // 追加
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import { deleteChat } from "@/services/ChatService"

// app/api/chat/[id]/route.ts
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
  
) {
  const { id } = await params;

const chatId = parseInt(id); // 数値に変換


  if (isNaN(chatId)) {
    return NextResponse.json({ error: "無効なチャットIDです" }, { status: 400 });
  }


    // 1. サーバー側でセッションを取得
    const session = await getServerSession(authOptions);

            
    // ログインしていない場合はエラー
    if (!session?.user?.id) {
        return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    // 2. ユーザidを取得
    const user_id = await getUserId(session.user.id)
    

    if (!user_id) {
        return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

  try {
    // 削除実行
    const body = await request.json();
    const {space_id}  = body; 
    const spaceNum = parseInt(space_id); // 数値に変換


    if (isNaN(spaceNum)) {
        return NextResponse.json({ error: "無効なスペースIDです" }, { status: 400 });
    }
    await deleteChat(chatId, user_id, spaceNum);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("サーバーエラー詳細:", error); // ← ここでエラーの正体が分かります！
    return NextResponse.json({ error: "削除失敗" }, { status: 500 });
  }
}