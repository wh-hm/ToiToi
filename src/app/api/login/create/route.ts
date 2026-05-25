import { NextResponse } from "next/server";
import {  registerUser } from "@/services/UserService";

export async function POST(request: Request) {
    try {
        const { google_id, email } = await request.json();

        if (!google_id) {
        return NextResponse.json({ error: "IDが必要です" }, { status: 400 });
        }

        // 2. 「登録または復活」をサービスに任せる
        // registerUser はサービス側で「削除済みなら復活、新規なら作成」を判定しています
        const user = await registerUser(google_id, email || "");
        
        // 3. 結果を返す
        return NextResponse.json({ 
            message: "ユーザーを準備しました", 
            user: user 
        }, { status: 200 });
        
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
    }
}