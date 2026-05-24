import { NextResponse } from "next/server";
import { updateSpace, deleteSpace } from "@/services/SpaceService";
import { getUserId } from "@/services/UserService"
import { getServerSession } from "next-auth"; // 追加
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

// 関数名は必ず大文字で PATCH
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // 1. サーバー側でセッションを取得
        const session = await getServerSession(authOptions);
                
        // ログインしていない場合はエラー
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証されていません" }, { status: 401 });
        }
        // 2. ユーザidを取得
        const user_id = await getUserId(session.user.id)
        
        if (!user_id) {
            return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
        }
        const { id } = await params; // Next.js 15系ならこれが必要
        const { name } = await request.json();
        
        const updated = await updateSpace(id, name, user_id);
        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: "更新失敗" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {

    // 1. サーバー側でセッションを取得
    const session = await getServerSession(authOptions);
            
    // ログインしていない場合はエラー
    if (!session?.user?.id) {
        return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }
    // 2. ユーザidを取得
    const user_id = await getUserId(session.user.id)
    
    if (!user_id) {
        return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }
    const { id } = await params;
    
    const success = await deleteSpace(id, user_id);
    
    if (success) {
        return NextResponse.json({ message: "削除しました" });
    } else {
        return NextResponse.json({ error: "削除失敗" }, { status: 400 });
    }
}