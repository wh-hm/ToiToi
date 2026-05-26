import { NextResponse } from "next/server";
import { toggleFavorite } from "@/services/SpaceService";
import { getUserId } from "@/services/UserService"
import { getServerSession } from "next-auth"; // 追加
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 


export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const user_id = await getUserId(session.user.id);
    const { id } = await params;
    
    const updated = await toggleFavorite(id, user_id!);
    return NextResponse.json(updated);
}