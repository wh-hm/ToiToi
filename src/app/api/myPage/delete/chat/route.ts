import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/services/UserService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { deleteSpaceChats } from "@/services/SpaceService";
import { prisma } from "@/lib/prisma";


export async function DELETE(
  request: NextRequest,
) {
  try {
    // 1. セッションとユーザーIDの取得
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "認証なし" }, { status: 401 });
    
    const user_id = await getUserId(session.user.id);
    if (!user_id) return NextResponse.json({ error: "ユーザー不明" }, { status: 404 });
    // 2. リクエストボディから space_id を取得
    

    // 3. 論理削除の実行
    const success = await deleteSpaceChats(prisma, user_id);
    if (!success) {
      return NextResponse.json({ error: "削除失敗または権限なし" }, { status: 404 });
    }

    return NextResponse.json({ message: "削除しました" });
  } catch (error) {
    console.error("【詳細なエラー発生】", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}