import { NextResponse } from "next/server";
import { getUserId, updateUsername } from "@/services/UserService";
import { ERRORS } from "@/constants/messages";



export async function POST(request: Request) {
    try {
        const { google_id, username } = await request.json();

        if (!username) {
        return NextResponse.json({ error: ERRORS.E1001("ユーザー名") }, { status: 400 });
        }

        if (username.length > 20) {
        return NextResponse.json({ error: ERRORS.E1002("ユーザー名", 20) }, { status: 400 });
        }

        // /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/ は「英数字・ひらがな・カタカナ・漢字」以外を判定します
        const invalidCharRegex = /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
        
        if (invalidCharRegex.test(username)) {
            return NextResponse.json(
            { error: ERRORS.E1003("ユーザー名") }, 
            { status: 400 }
            );
        }

        if (!google_id) {
        return NextResponse.json({ error: "IDが必要です" }, { status: 400 });
        }
        const user_id = await getUserId(google_id);
        if(!user_id){
            return NextResponse.json({ error: "ユーザIDが必要です" }, { status: 400 });
        }
        // ユーザー名を更新
        const isUpdated = await updateUsername(user_id, username);

        if (!isUpdated) {
            return NextResponse.json({ error: "更新失敗" }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
    }
}