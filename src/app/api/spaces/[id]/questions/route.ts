import { NextResponse } from "next/server";
import { deleteSpaces } from "@/services/SpaceService";
import { getAuthContext } from "@/lib/auth-guard"; // 共通化した認証ガード
import { MESSAGES } from "@/constants/messages";

export async function DELETE(
    request: Request, 
    { params }: { params: { id: string } }
) {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        // 1. パラメータの取得
        const { id: idString } = await params;
        
        // 2. string を number に変換
        const id = Number(idString);
        
        // 変換に失敗していないか確認（数値ではない場合）
        if (isNaN(id)) {
            return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
        }

        // 3. サービス層へ渡す（ここでは例として "ALL" としていますが、必要ならここも動的に取得可能）
        const success = await deleteSpaces(auth.user_id, "QUESTION"); 
        
        if (!success) return NextResponse.json({ error: MESSAGES.E2004("質問スペース全削除") }, { status: 500 });
        
        return NextResponse.json({ message: MESSAGES.S1003("質問スペース全削除") });
    } catch (error) {
        return NextResponse.json({ error: MESSAGES.E2004("質問スペース全削除") }, { status: 500 });
    }
}