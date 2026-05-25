
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/services/UserService"
import { getServerSession } from "next-auth"; // 追加
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import { deleteQuestionChat } from "@/services/QuestionMessageService"
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chatId = Number(id);
  

  // 1. サーバー側でセッションを取得
        const session = await getServerSession(authOptions);

        const body = await request.json();
        const { question_id } = body; // 修正：URLではなくbodyから取得
                
        // ログインしていない場合はエラー
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証されていません" }, { status: 401 });
        }
        // 2. ユーザidを取得
        const user_id = await getUserId(session.user.id)
        
        if (!user_id) {
            return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
        }

  // DB削除（または論理削除）処理
  await deleteQuestionChat(chatId, user_id, Number(question_id));
  return NextResponse.json({ message: "削除しました" });
}