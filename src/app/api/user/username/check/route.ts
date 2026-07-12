import { NextResponse } from "next/server";
import { getUsername } from "@/services/UserService";
import { getAuthContext } from "@/lib/auth-guard"; // 共通化した認証ガードをインポート
import { MESSAGES } from "@/constants/messages";

export async function GET() {
    // 1. 認証チェックを共通化された関数で行う
    const auth = await getAuthContext();
    if ('error' in auth) {
        return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    try {
        const userName = await getUsername(auth.user_id);
        if (!userName) {
            return NextResponse.json({ hasUsername: false });
        }
        return NextResponse.json({ 
            hasUsername: true, 
            userName: userName, 
            message: MESSAGES.S2001("ユーザー名") 
        }, { status: 200 });

    } catch (error) {
        console.error("GET Username Error:", error);
        return NextResponse.json(
            { message: MESSAGES.E2003("ユーザー名") }, 
            { status: 500 }
        );
    }
}