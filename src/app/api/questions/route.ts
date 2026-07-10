import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { registerQuestion, getQuestions } from "@/services/QuestionService";
import { MESSAGES } from "@/constants/messages";
import { getSpaceCheck } from "@/services/SpaceService";


// 1. GET: 質問一覧取得
export async function GET(request: NextRequest) {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const space_id = Number(searchParams.get("space_id"));

    if (!space_id || isNaN(space_id)) {
        return NextResponse.json({ message: MESSAGES.E1001("スペースID") }, { status: 400 });
    }

    const isSpaceAlive = await getSpaceCheck(auth.user_id, space_id);
    // スペースチェックの判定
    if (!isSpaceAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    }


    try {
        const questions = await getQuestions(space_id, auth.user_id);
        return NextResponse.json(questions);
    } catch (error) {
        return NextResponse.json({ message: MESSAGES.E2003("質問") }, { status: 500 });
    }
}

// 2. POST: 質問作成
export async function POST(request: NextRequest) {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

    try {
        const { title, question, space_id, tag } = await request.json();

        // --- 単体チェック ---
        // 1. 必須チェック (E1001)
        if (!title) return NextResponse.json({ message: MESSAGES.E1001("質問タイトル") }, { status: 400 });
        if (!question) return NextResponse.json({ message: MESSAGES.E1001("質問詳細") }, { status: 400 });

        // 2. 桁数チェック (E1002: タイトル50文字, 詳細100文字)
        if (title.length > 50) return NextResponse.json({ message: MESSAGES.E1002("質問タイトル", 50) }, { status: 400 });
        if (question.length > 100) return NextResponse.json({ message: MESSAGES.E1002("質問詳細", 100) }, { status: 400 });

             // ※関数名が推測ですが合わせる
        const isSpaceAlive = await getSpaceCheck(auth.user_id, space_id);
        // スペースチェックの判定
        if (!isSpaceAlive) {
            return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
        }

        // データベースに保存
        const newQuestion = await registerQuestion(
            space_id,
            auth.user_id,
            title,
            question,
            tag || 0
        );

        return NextResponse.json(newQuestion, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: MESSAGES.E2001("質問") }, { status: 500 });
    }
}
