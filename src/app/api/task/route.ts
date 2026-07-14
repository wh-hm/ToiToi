import { NextRequest, NextResponse } from "next/server";
import { getTasks, registerTask } from "@/services/TaskService";
import { getSpaceCheck } from "@/services/SpaceService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";

const safeRegex = /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF01-\uFF5E]/;

// 1. GET: タスク一覧取得
export async function GET(request: NextRequest) {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const spaceIdParam = searchParams.get("spaceId") || searchParams.get("space_id");
    const spaceId = Number(spaceIdParam);

    if (!spaceId || isNaN(spaceId)) {
        return NextResponse.json({ message: MESSAGES.E1001("スペースID") }, { status: 400 });
    }

    try {
        const isSpaceAlive = await getSpaceCheck(auth.user_id, spaceId);
        if (!isSpaceAlive) {
            return NextResponse.json({ message: MESSAGES.E1010("対象のスペース") }, { status: 404 });
        }

        const tasks = await getTasks(spaceId, auth.user_id);
        return NextResponse.json({
            incomplete: tasks.filter((t) => t.status === 0),
            complete: tasks.filter((t) => t.status === 1),
        });
    } catch (error) {
        return NextResponse.json({ message: MESSAGES.E2003("タスク") }, { status: 500 });
    }
}

// 2. POST: タスク登録（単体チェック実装）
export async function POST(request: NextRequest) {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

    try {
        const body = await request.json();
        
        // 💡 キャメルケースに統一（どちらで送られてきても受け取れるようにフォールバックを設定）
        const spaceId = Number(body.spaceId || body.space_id);
        const title = body.title;
        const description = body.description;
        const dueDate = body.dueDate || body.due_date;
        const tag = body.tag;
        const isAllDay = body.isAllDay ?? body.is_allday;
        const priority = body.priority;

        // 1. 必須チェック (E1001)
        if (!title || title.trim() === "") return NextResponse.json({ message: MESSAGES.E1001("タスク名") }, { status: 400 });
        if (!dueDate) return NextResponse.json({ message: MESSAGES.E1001("期限") }, { status: 400 });

        if (title.length > 20) return NextResponse.json({ message: MESSAGES.E1002("タスク名", 20) }, { status: 400 });
        if (description && description.length > 100) return NextResponse.json({ message: MESSAGES.E1002("詳細", 100) }, { status: 400 });

        if (safeRegex.test(title) || (description && safeRegex.test(description))) {
            return NextResponse.json({ message: MESSAGES.E1003("タスク名または詳細", "記号") }, { status: 400 });
        }

        const inputDate = new Date(dueDate);
        if (isNaN(inputDate.getTime())) {
            return NextResponse.json({ message: MESSAGES.E1004 }, { status: 400 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (inputDate < today) {
            return NextResponse.json({ message: MESSAGES.E1011 }, { status: 400 });
        }

        const isSpaceAlive = await getSpaceCheck(auth.user_id, spaceId);
        if (!isSpaceAlive) {
            return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
        }

        // データベース保存（引数もキャメルケースの変数に修正）
        const newTask = await registerTask(
            auth.user_id, title, description, dueDate, spaceId, tag || 0, isAllDay, priority
        );

        return NextResponse.json(newTask, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: MESSAGES.E2001("タスク") }, { status: 500 });
    }
}