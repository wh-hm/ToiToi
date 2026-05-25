import { prisma } from "@/lib/prisma"; // 適宜パスは調整してください
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/services/UserService"
import { getServerSession } from "next-auth"; // 追加
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import { registerChat } from "@/services/ChatService"

// src/app/api/chat/[id]/route.ts

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const spaceIdNum = parseInt(id);

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
    // getTasks（または getMessages）関数を使ってDBから取得
    const messages = await prisma.chat.findMany({
      where: { space_id: spaceIdNum, delete_flag: 0 },
      orderBy: { created_at: 'asc' }, // 古い順に表示
    });
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: "取得失敗" }, { status: 500 });
  }
}


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // これが "6"
  const spaceIdNum = parseInt(id); // 数値に変換

  // URLにIDが含まれているかチェック
  if (isNaN(spaceIdNum)) {
    return NextResponse.json({ error: "無効なスペースIDです" }, { status: 400 });
  }

  const body = await request.json();
  const { content, type } = body; 

  // 認証関連（ここはそのまま）
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証されていません" }, { status: 401 });
  }

const user_id = await getUserId(session.user.id)
if (!user_id) {
            return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
        }

  try {
    // 修正：引数を整理
    const newMessage = await registerChat({
      user_id: user_id, // 必要に応じて getUserId を通す
      space_id: spaceIdNum,
      message: type === 'text' ? content : undefined,
      stamp: type === 'stamp' ? content : undefined,
      image_url: type === 'image_url' ? content : undefined,
    });

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("保存エラー:", error); // エラー内容をログに出すと原因がすぐわかります！
    return NextResponse.json({ error: "送信失敗" }, { status: 500 });
  }
}