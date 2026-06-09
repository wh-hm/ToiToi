import { NextResponse } from "next/server";
import { deleteSpaces } from "@/services/SpaceService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";

export async function DELETE() {
    const auth = await getAuthContext();
    if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        // 1. スペースの種類を特定（このAPIは "CHAT" 用であると仮定）
        const spaceType = "CHAT"; 
        
        // 2. サービス層で全削除を実行
        const success = await deleteSpaces(auth.user_id, spaceType); 
        
        if (!success) {
            return NextResponse.json(
                { error: MESSAGES.E2004("チャットスペース全削除") }, 
                { status: 500 }
            );
        }
        
        return NextResponse.json({ message: MESSAGES.S1003("チャットスペース全削除") });
    } catch (error) {
        console.error("【全削除エラー】", error);
        return NextResponse.json(
            { error: MESSAGES.E2004("チャットスペース全削除") }, 
            { status: 500 }
        );
    }
}