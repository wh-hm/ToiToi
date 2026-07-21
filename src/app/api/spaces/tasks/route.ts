import { NextResponse } from "next/server";
import { deleteSpaces } from "@/services/SpaceService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
    // 1. 認証チェック
    const auth = await getAuthContext();
    if ('error' in auth) {
        return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    try {
        // 2. サービス層でタスク(TASK)の全削除を実行
        const success = await prisma.$transaction(async (tx) => {
            return await deleteSpaces(auth.user_id, "TASK", tx);
        });
        
        if (!success) {
            return NextResponse.json(
                { message: MESSAGES.E2006 }, 
                { status: 409 }
            );
        }
        
        return NextResponse.json({ 
            success: true, 
            message: MESSAGES.S1003("タスクスペース全削除") 
        });
    } catch (error) {
        console.error("DELETE TaskSpaces Error:", error);
        return NextResponse.json(
            { message: MESSAGES.E2004("タスクスペース全削除") }, 
            { status: 500 }
        );
    }
}