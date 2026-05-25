import { NextResponse } from "next/server";
import {getUsername} from "@/services/UserService"
import { getUserId } from "@/services/UserService"
import { getServerSession } from "next-auth"; // 追加
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

export async function GET(request: Request) {
  // URLから googleId を取得
    const { searchParams } = new URL(request.url);
    const googleId = searchParams.get("googleId");

    if (!googleId) {
        return NextResponse.json({ hasUsername: false });
    }

    try {

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

            
        // DBからユーザーを検索
        const userName = await getUsername(user_id);


        // ユーザーが存在し、かつ username が null や空文字ではないか判定
        if(!userName){
            return NextResponse.json({ hasUsername: false });
        }
        return NextResponse.json({ hasUsername: true, userName });
    } catch (error) {
        console.error("ユーザー確認エラー:", error);
        return NextResponse.json({ hasUsername: false }, { status: 500 });
    }
}