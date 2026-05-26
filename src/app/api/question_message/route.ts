import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/services/UserService"
import { getServerSession } from "next-auth"; // 追加
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import { getQuestionChats, registerQuestionChat } from "@/services/QuestionMessageService"



export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const question_id = searchParams.get("questionId");

    if (!question_id) {
        return NextResponse.json({ error: "question_idが必要です" }, { status: 400 });
    }

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

        const questionIdNum = Number(question_id);


        // 該当スペースのタスクをすべて取得
        const success = await getQuestionChats(user_id, questionIdNum);


        return NextResponse.json(success);
    } catch (error) {
        console.error("タスク取得エラー:", error);
        return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
    }
}




export async function POST(request: NextRequest) {
  try {

    // 1. サーバー側でセッションを取得
        const session = await getServerSession(authOptions);
        const { searchParams } = new URL(request.url);

        const question_id = searchParams.get("questionId"); // クエリからID取得
                
        // ログインしていない場合はエラー
        if (!session?.user?.id) {
            return NextResponse.json({ error: "認証されていません" }, { status: 401 });
        }
        // 2. ユーザidを取得
        const user_id = await getUserId(session.user.id)
        
        if (!user_id) {
            return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
        }

    const body = await request.json();
    const { content, type } = body;
   
const success = await registerQuestionChat({
      question_id: Number(question_id), // クエリから取得したIDを使用
      user_id: user_id,
      content: type === "text" ? content : null,
      stamp: type === "stamp" ? content : null,
      // image_url は必要に応じて処理
    });
    
    

    return NextResponse.json(success, { status: 201 });
  } catch (error) {
    console.error("タスク作成エラー:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}