import { NextResponse } from "next/server";
import { registerSpace } from "@/services/SpaceService"; 
import { getUserId } from "@/services/UserService"; 
import { getServerSession } from "next-auth"; // 追加
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

export async function POST(request: Request) {
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
        


        // ここで一度だけ読み取る
        const body = await request.json();
        console.log("受け取ったデータ:", body);

        // body から変数を取り出す
        const { name, space_type } = body;

        
        // サービス層のメソッドを呼び出す（descriptionが未定義なら空文字を渡す）
        const success = await registerSpace(user_id, name,  space_type);
        
        if (success) {
            return NextResponse.json({ message: "登録成功" });
        } else {
            return NextResponse.json({ error: "登録失敗" }, { status: 500 });
        }
    } catch (error) {
        console.error("APIエラー詳細:", error);
        return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
    }
}