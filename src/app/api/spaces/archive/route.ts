import { NextResponse } from "next/server";
import { deleteArchives } from "@/services/SpaceService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";
import { prisma } from "@/lib/prisma";
        
// 2. DELETE: スペース削除
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
    try {
        const success = await prisma.$transaction(async (tx) => {
            return await deleteArchives(auth.user_id, tx );
        });
        if (!success) {
            return NextResponse.json(
                { message: MESSAGES.E2006 }, 
                { status: 409 }
            );
        }
        return NextResponse.json({ 
            success: true, 
            message: MESSAGES.S1003("アーカイブされたスペース全削除") 
        },{ status: 200 });
    } catch (error) {
        return NextResponse.json({ message: MESSAGES.E2004("スペース") }, { status: 500 });
    }
}
