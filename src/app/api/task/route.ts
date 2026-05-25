import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/services/UserService"
import { getServerSession } from "next-auth"; // 追加
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import { getTasks, registerTask } from "@/services/TaskService"

export async function GET(request: NextRequest) {
  // URLから spaceId を取得 (?spaceId=123)
    const { searchParams } = new URL(request.url);
    const spaceId = searchParams.get("spaceId");

    if (!spaceId) {
        return NextResponse.json({ error: "spaceIdが必要です" }, { status: 400 });
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

        const { searchParams } = new URL(request.url);
        const spaceId = searchParams.get("spaceId");

        if (!spaceId) {
            return NextResponse.json({ error: "spaceIdが必要です" }, { status: 400 });
        }

        // 該当スペースのタスクをすべて取得
        const tasks = await getTasks(user_id, Number(spaceId));

        console.log("取得")


        // フロントエンドで処理しやすいように、取得したデータを未完了・完了に分ける
        const incomplete = tasks.filter((t) => t.status === 0);
        const complete = tasks.filter((t) => t.status === 1);

        console.log(complete)
        console.log(incomplete)


        return NextResponse.json({ incomplete, complete });
    } catch (error) {
        console.error("タスク取得エラー:", error);
        return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
    }
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
    const { title, due_date, space_id, tag } = body;

    

    // バリデーション
    // if (!title || !due_date || !space_id) {
    //     return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    // }
    // データベースに保存
    const newTask = await registerTask(
        
        {title,
        user_id: user_id,
        tag: tag || 0,
        due_date:  due_date, // 文字列を日付型に変換
        space_id: parseInt(space_id),
        
  });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error("タスク作成エラー:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}