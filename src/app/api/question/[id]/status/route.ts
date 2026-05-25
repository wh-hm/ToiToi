import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/services/UserService"
import { getServerSession } from "next-auth"; // 追加
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import { updateQuestionStatus } from "@/services/QuestionService"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { is_resolved, space_id } = body;

  try {
    // ユーザー認証の確認は既存のDELETEと同じように行ってください
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

    const spaceNum = Number(space_id); 
    const questionId = Number(id);
    const resolvedNum = Number(is_resolved);

    if (isNaN(spaceNum)) {
        return NextResponse.json({ error: "無効なスペースID" }, { status: 400 });
    }
    // Prismaでの更新処理
    await updateQuestionStatus(questionId, user_id, spaceNum, resolvedNum);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCHエラー:", error);
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}