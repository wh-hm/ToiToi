import { NextResponse } from "next/server";
import { updateUsername } from "@/services/UserService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";

export async function POST(request: Request) {
    // 1. 共通の認証ガードを使用（セッションチェックとuser_id取得を統合）
    const auth = await getAuthContext();
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const { username } = await request.json();

        // 2. 単体チェック（バリデーション）
        if (!username) {
            return NextResponse.json({ error: MESSAGES.E1001("ユーザー名") }, { status: 400 });
        }

        if (username.length > 10) {
            return NextResponse.json({ error: MESSAGES.E1002("ユーザー名", 10) }, { status: 400 });
        }

        const invalidCharRegex = /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
        if (invalidCharRegex.test(username)) {
            return NextResponse.json(
                { error: MESSAGES.E1003("ユーザー名", "記号") }, 
                { status: 400 }
            );
        }

        // 3. ユーザー名を更新
        const isUpdated = await updateUsername(auth.user_id, username);
        if (!isUpdated) {
            return NextResponse.json({ error: MESSAGES.E2002("ユーザー名") }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: MESSAGES.S1002("ユーザー名") });

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: MESSAGES.E2002("ユーザー名") }, { status: 500 });
    }
}