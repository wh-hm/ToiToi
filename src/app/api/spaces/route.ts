import { NextResponse } from "next/server";
import { registerSpace, deleteSpace } from "@/services/SpaceService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";

// 2. POST: スペース登録（単体チェックを追加）
export async function POST(request: Request) {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const { name, space_type } = await request.json();
        
        // --- 単体チェック ---
        // 1. 必須チェック (E1001)
        if (!name) return NextResponse.json({ error: MESSAGES.E1001("スペース名") }, { status: 400 });

        // 2. 桁数チェック (E1002: 20文字)
        if (name.length > 20) return NextResponse.json({ error: MESSAGES.E1002("スペース名", 20) }, { status: 400 });

        // 3. 不適切文字チェック (E1003: 記号制限)
        const safeRegex = /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+$/;
        if (!safeRegex.test(name)) {
            return NextResponse.json({ error: MESSAGES.E1003("スペース名", "記号") }, { status: 400 });
        }

        const success = await registerSpace(auth.user_id, name, space_type);
        if (!success) return NextResponse.json({ error: MESSAGES.E2001("スペース") }, { status: 500 });

        return NextResponse.json({ message: MESSAGES.S1001("スペース") });
    } catch (error) {
        return NextResponse.json({ error: MESSAGES.E2001("スペース") }, { status: 500 });
    }
}

// 3. DELETE: スペース削除（パラメータチェックを追加）
export async function DELETE(request: Request) {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const { searchParams } = new URL(request.url);
        const id = Number(searchParams.get("id"));
        const spaceType = searchParams.get("space_type");

        // パラメータチェック
        if (isNaN(id) || !spaceType) {
            return NextResponse.json({ error: MESSAGES.E1001("削除対象") }, { status: 400 });
        }

        const success = await deleteSpace(id, spaceType, auth.user_id);
        if (!success) return NextResponse.json({ error: MESSAGES.E2004("スペース") }, { status: 500 });
        
        return NextResponse.json({ message: MESSAGES.S1003("スペース") });
    } catch (error) {
        return NextResponse.json({ error: MESSAGES.E2004("スペース") }, { status: 500 });
    }
}