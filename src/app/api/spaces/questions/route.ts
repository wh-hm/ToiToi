import { NextResponse } from "next/server";
import { deleteSpaces } from "@/services/SpaceService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";

export async function DELETE() {
    // 1. 認証チェック
    const auth = await getAuthContext();
    if ('error' in auth) {
        return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    try {
        const success = await deleteSpaces(auth.user_id, "QUESTION"); 
        if (!success) {
            return NextResponse.json(
                { message: MESSAGES.E2004("質問スペース全削除") }, 
                { status: 500 }
            );
        }
        return NextResponse.json({ 
            success: true, 
            message: MESSAGES.S1003("質問スペース全削除") 
        });
    } catch (error) {
        console.error("DELETE QuestionSpaces Error:", error);
        return NextResponse.json(
            { message: MESSAGES.E2004("質問スペース全削除") }, 
            { status: 500 }
        );
    }
}