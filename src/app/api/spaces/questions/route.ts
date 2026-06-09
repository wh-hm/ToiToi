import { NextResponse } from "next/server";
import { deleteSpaces } from "@/services/SpaceService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";

export async function DELETE() {
    // 1. 認証チェック
    const auth = await getAuthContext();
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        // 2. サービス層で全削除を実行
        // 種類をハードコードせず、APIの役割として「QUESTION」を指定
        const success = await deleteSpaces(auth.user_id, "QUESTION"); 
        
        if (!success) {
            return NextResponse.json(
                { error: MESSAGES.E2004("質問スペース全削除") }, 
                { status: 500 }
            );
        }
        
        return NextResponse.json({ message: MESSAGES.S1003("質問スペース全削除") });
    } catch (error) {
        console.error("【質問スペース全削除エラー】", error);
        return NextResponse.json(
            { error: MESSAGES.E2004("質問スペース全削除") }, 
            { status: 500 }
        );
    }
}