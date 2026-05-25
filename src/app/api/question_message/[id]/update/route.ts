import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/services/UserService"
import { getServerSession } from "next-auth"; // 追加
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import { updateQuestionChat } from "@/services/QuestionMessageService"



export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
    const chatId = Number(id);
    
  
    // 1. サーバー側でセッションを取得
          const session = await getServerSession(authOptions);
  
          const body = await request.json();
  const { questionId, message } = body;
                  
          // ログインしていない場合はエラー
          if (!session?.user?.id) {
              return NextResponse.json({ error: "認証されていません" }, { status: 401 });
          }
          // 2. ユーザidを取得
          const user_id = await getUserId(session.user.id)
          
          if (!user_id) {
              return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
          }


  // DB更新処理
  const updated = await updateQuestionChat(chatId, Number(questionId), user_id, message);
  return NextResponse.json(updated);
}