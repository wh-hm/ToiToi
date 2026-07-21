import { NextResponse } from "next/server";
import { registerSpace, deleteSpaces, getSpaces } from "@/services/SpaceService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";
import { prisma } from "@/lib/prisma";


// 1. GET: スペース一覧取得
export async function GET() {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

    try {
        const spaces = await getSpaces(auth.user_id); 

        // 3. 型ごとのフィルタリング
        const result = {
            chat: spaces.filter(s => s.space_type === 1),
            task: spaces.filter(s => s.space_type === 2),
            question: spaces.filter(s => s.space_type === 3),
        };
        
        return NextResponse.json({ 
            spaces: result, 
            message: MESSAGES.S2001("スペース一覧") 
        });
    } catch (error) {
        console.error("GET spaces error:", error);
        return NextResponse.json({ message: MESSAGES.E2001("スペース一覧") }, { status: 500 });
    }
}

// 2. POST: スペース登録（単体チェックを追加）
export async function POST(request: Request) {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

    try {
        //const body = await request.json();
        const { name, spaceType, favoriteFlag, isArchived } = await request.json();
        
        // --- 単体チェック ---
        // 1. 必須チェック (E1001)
        if (!name || name.trim() === "") {
            return NextResponse.json({ message: MESSAGES.E1001("スペース名") }, { status: 400 });
        }        
        // 2. 桁数チェック (E1002: 20文字)
        if (name.length > 20) return NextResponse.json({ message: MESSAGES.E1002("スペース名", 20) }, { status: 400 });

        // 3. 不適切文字チェック (E1003: 記号制限)
        const safeRegex = /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF01-\uFF5E]/;

        if (safeRegex.test(name)) {
            return NextResponse.json({ message: MESSAGES.E1003("スペース名", "記号") }, { status: 400 });
        }

        const newSpace = await registerSpace(auth.user_id, name, spaceType, favoriteFlag, isArchived);
        if (!newSpace) return NextResponse.json({ message: MESSAGES.E2001("スペース") }, { status: 500 });
        
        return NextResponse.json({ 
            space: newSpace, 
            message: MESSAGES.S1001("スペース") 
        }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: MESSAGES.E2001("スペース") }, { status: 500 });
    }
}

// 3. DELETE: スペース削除（パラメータチェックを追加）
export async function DELETE() {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

    try {
        const success = await prisma.$transaction(async (tx) => {
            return await deleteSpaces(auth.user_id, "ALL", tx );
        });
        if (!success) {
            return NextResponse.json(
                { message: MESSAGES.E2006 }, 
                { status: 409 }
            );
        }
        return NextResponse.json({ 
            success: true, 
            message: MESSAGES.S1003("スペース") 
        });
    } catch (error) {
        return NextResponse.json({ message: MESSAGES.E2004("スペース") }, { status: 500 });
    }
}