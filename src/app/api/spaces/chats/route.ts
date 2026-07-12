import { NextResponse } from "next/server";
import { deleteSpaces } from "@/services/SpaceService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";

export async function DELETE() {
    const auth = await getAuthContext();
    if ('error' in auth) {
        return NextResponse.json({ message: auth.error }, { status: auth.status });
    }
    try {
        const spaceType = "CHAT"; 
        const success = await deleteSpaces(auth.user_id, spaceType); 
        if (!success) {
            return NextResponse.json(
                { message: MESSAGES.E2004("チャットスペース全削除") }, 
                { status: 500 }
            );
        }
        return NextResponse.json({ 
            success: true, 
            message: MESSAGES.S1003("チャットスペース全削除") 
        });
    } catch (error) {
        console.error("DELETE ChatSpaces Error:", error);
        return NextResponse.json(
            { message: MESSAGES.E2004("チャットスペース全削除") }, 
            { status: 500 }
        );
    }
}