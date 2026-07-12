import { NextResponse } from "next/server";
import { deleteArchives } from "@/services/SpaceService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";
        
// 2. DELETE: スペース削除
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {

        const success = await deleteArchives(auth.user_id);
        
        if (!success) return NextResponse.json({ error: MESSAGES.E2004("スペース") }, { status: 500 });
        
         return NextResponse.json({ 
            success: true, 
            message: MESSAGES.S1003("アーカイブされたスペース全削除") 
        });
    } catch (error) {
        return NextResponse.json({ error: MESSAGES.E2004("スペース") }, { status: 500 });
    }
}
