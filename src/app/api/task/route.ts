import { NextResponse } from "next/server";
import { getTasks, registerTask } from "@/services/TaskService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";
const safeRegex = /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF01-\uFF5E]/;

// 1. GET: タスク一覧取得
export async function GET(request: Request) {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const spaceId = Number(searchParams.get("spaceId"));

    if (!spaceId || isNaN(spaceId)) {
        return NextResponse.json({ error: MESSAGES.E1001("スペースID") }, { status: 400 });
    }

    try {
        const tasks = await getTasks(spaceId, auth.user_id);
        return NextResponse.json({
            incomplete: tasks.filter((t) => t.status === 0),
            complete: tasks.filter((t) => t.status === 1),
        });
    } catch (error) {
        return NextResponse.json({ error: MESSAGES.E2003("タスク") }, { status: 500 });
    }
}

// 2. POST: タスク登録（単体チェック実装）
export async function POST(request: Request) {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        const { title, description, due_date, space_id, tag, is_allday, priority } = await request.json();

        // --- 単体チェック ---
        // 1. 必須チェック (E1001)
        if (!title) return NextResponse.json({ error: MESSAGES.E1001("タスク名") }, { status: 400 });
        if (!due_date) return NextResponse.json({ error: MESSAGES.E1001("期限") }, { status: 400 });
        if (!description) return NextResponse.json({ error: MESSAGES.E1001("詳細") }, { status: 400 });

        // 2. 桁数チェック (E1002)
        if (title.length > 20) return NextResponse.json({ error: MESSAGES.E1002("タスク名", 20) }, { status: 400 });
        if (description.length > 100) return NextResponse.json({ error: MESSAGES.E1002("詳細", 100) }, { status: 400 });

        // 3. 不適切文字チェック (E1003)
        if (safeRegex.test(title) || safeRegex.test(description)) {
            return NextResponse.json({ error: MESSAGES.E1003("タスク名または詳細", "記号") }, { status: 400 });
        }

        // 4. 日付適切チェック (E1004)
        if (new Date(due_date).toString() === "Invalid Date") {
            return NextResponse.json({ error: MESSAGES.E1004 }, { status: 400 });
        }

        // データベース保存
        const newTask = await registerTask(
            auth.user_id, title, description, due_date, space_id, tag || 0, is_allday, priority
        );

        return NextResponse.json(newTask, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: MESSAGES.E2001("タスク") }, { status: 500 });
    }
}