import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/services/UserService"
import { getServerSession } from "next-auth"; // 追加
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import {  registerQuestion, getQuestions } from "@/services/QuestionService"

// route.ts 内の GET
export async function GET(request: NextRequest) {
    // ...認証処理などは既存のものを使用
    console.log("GETリクエスト受信"); // ★ログが出るか確認

    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get("spaceId");

    if (!spaceId) {
        return NextResponse.json({ error: "spaceIdが必要です" }, { status: 400 });
    }

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

    
    // Prismaで質問を取得 (Questionモデルと仮定)
    const questions = await getQuestions(user_id, Number(spaceId));

    return NextResponse.json(questions);
}



export async function POST(request: NextRequest) {
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

    const body = await request.json();
    console.log("★APIが受け取った生データ:", body);
    const { title,  space_id, tag, question } = body;

    
    // データベースに保存
    const newTask = await registerQuestion(
        user_id,
        title,
        tag,
        question,
        space_id,
    );

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error("タスク作成エラー:", error);
    console.error("API Error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}