import { NextResponse } from "next/server";
import { updateUsername } from "@/services/UserService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";
import { checkUser } from "@/services/UserService";

export async function PATCH(request: Request) {
    // 1. 共通の認証ガードを使用（セッションチェックとuser_id取得を統合）
    const auth = await getAuthContext();
    if ('error' in auth) {
        return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    try {

        const userCheck = await checkUser(auth.user_id);
        if (!userCheck) {
            // 404 Not Found を返す
            return NextResponse.json(
                { message: MESSAGES.E2005("ユーザー") }, 
                { status: 404 }
            );
        }
        const { username } = await request.json();

        // 2. 単体チェック（バリデーション）
        if (!username) {
            return NextResponse.json({ message: MESSAGES.E1001("ユーザー名") }, { status: 400 });
        }

        if (username.length > 10) {
            return NextResponse.json({ message: MESSAGES.E1002("ユーザー名", 10) }, { status: 400 });
        }
        const invalidCharRegex = /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF01-\uFF5E]/;
        if (invalidCharRegex.test(username)) {
            return NextResponse.json(
                { message: MESSAGES.E1003("ユーザー名", "記号") }, 
                { status: 400 }
            );
        }


        // 3. ユーザー名を更新
        const isUpdated = await updateUsername(auth.user_id, username);
        
        
        if (!isUpdated) {
            return NextResponse.json({ message: MESSAGES.E2002("ユーザー名") }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: MESSAGES.S1002("ユーザー名") });

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ message: MESSAGES.E2002("ユーザー名") }, { status: 500 });
    }
}