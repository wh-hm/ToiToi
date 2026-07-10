import { NextResponse } from "next/server";
import { updateSpace, deleteSpace } from "@/services/SpaceService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";
import { getSpaceCheck } from "@/services/SpaceService";
const safeRegex = /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF01-\uFF5E]/;



// 1. PATCH: スペースの更新
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const { id } = await params;
        const { name, favoriteFlag, isArchived } = await request.json();

        // --- 単体チェック (POSTと同じ仕様) ---
        if (!name) return NextResponse.json({ error: MESSAGES.E1001("スペース名") }, { status: 400 });
        if (name.length > 20) return NextResponse.json({ error: MESSAGES.E1002("スペース名", 20) }, { status: 400 });
        if (safeRegex.test(name)) {
            return NextResponse.json({ error: MESSAGES.E1003("スペース名", "記号") }, { status: 400 });
        }
        const isSpaceAlive = await getSpaceCheck(auth.user_id, Number(id));
        // スペースチェックの判定
        if (!isSpaceAlive) {
            return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
        }
        
        const updatedSpace = await updateSpace(Number(id), name, auth.user_id, favoriteFlag, isArchived);
        
        if (!updatedSpace) return NextResponse.json({ error: MESSAGES.E2002("スペース") }, { status: 500 });

        // 成功時：キーを space にし、S1002 を適用
        return NextResponse.json({ 
            space: updatedSpace, 
            message: MESSAGES.S1002("スペース") 
        }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: MESSAGES.E2002("スペース") }, { status: 500 });
    }
}

// 2. DELETE: スペース削除
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const { id } = await params;
        const spaceId = Number(id);
        
        const { searchParams } = new URL(request.url);
        const spaceType = searchParams.get("spaceType");

        // 必須パラメータチェック
        if (!spaceType) {
            return NextResponse.json(
                { error: MESSAGES.E1001("スペースタイプ") }, 
                { status: 400 }
            );
        }
        
        const success = await deleteSpace(spaceId, spaceType, auth.user_id);
        
        if (!success) return NextResponse.json({ error: MESSAGES.E2004("スペース") }, { status: 500 });
        
        return NextResponse.json({ 
            success: true, 
            message: MESSAGES.S1003("スペース") 
        });
    } catch (error) {
        return NextResponse.json({ error: MESSAGES.E2004("スペース") }, { status: 500 });
    }
}
