import { NextResponse } from "next/server";
import { getTasks, registerTask } from "@/services/TaskService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";
import { getSpaceCheck } from "@/services/SpaceService";
const safeRegex = /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF01-\uFF5E]/;

// 1. GET: タスク一覧取得
export async function GET(request: Request) {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const spaceId = Number(searchParams.get("spaceId"));

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
            message: MESSAGES.S2001("タスク一覧") // 成功時も一貫して追加
        });
    } catch (error) {
        return NextResponse.json({ message: MESSAGES.E2003("タスク") }, { status: 500 });
    }
}
// 2. POST: タスク登録（単体チェック実装）
export async function POST(request: Request) {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

    try {
        const { title, description, dueDate, spaceId, tag, isAllday, priority } = await request.json();

        // 1. 必須チェック (E1001)
        if (!title || title.trim() === "") return NextResponse.json({ message: MESSAGES.E1001("タスク名") }, { status: 400 });
        if (!dueDate) return NextResponse.json({ message: MESSAGES.E1001("期限") }, { status: 400 });

        // 2. 桁数チェック (E1002)
        if (title.length > 20) return NextResponse.json({ message: MESSAGES.E1002("タスク名", 20) }, { status: 400 });
        if (description.length > 100) return NextResponse.json({ message: MESSAGES.E1002("詳細", 100) }, { status: 400 });

        // 3. 不適切文字チェック (E1003)
        if (safeRegex.test(title) || safeRegex.test(description)) {
            return NextResponse.json({ message: MESSAGES.E1003("タスク名または詳細", "記号") }, { status: 400 });
        }

        // 4. 日付形式チェック & 過去日チェック (E1004)
        const inputDate = new Date(dueDate);
        console.log(dueDate)

        console.log(inputDate)
        if (inputDate.toString() === "Invalid Date") {
            return NextResponse.json({ message: MESSAGES.E1004 }, { status: 400 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0); // 時間をリセットして日付だけで比較できるようにする
        
        if (inputDate < today) {
            // 📝 ここには仕様書で定義されている「過去日のエラーメッセージ」を当てはめてください
            return NextResponse.json({ message: MESSAGES.E1011 }, { status: 400 });
        }

        const isSpaceAlive = await getSpaceCheck(auth.user_id, spaceId);
        
        if (!isSpaceAlive) {
            return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
        }

        // データベース保存
        const newTask = await registerTask(
            auth.user_id, title, description, dueDate, spaceId, tag || 0, isAllday, priority
        );

        return NextResponse.json({ 
            task: newTask, // キーをタスク単体へ
            message: MESSAGES.S1001("タスク") 
        }, { status: 201 });

    } catch (error) {
        return NextResponse.json({ message: MESSAGES.E2001("タスク") }, { status: 500 });
    }
}