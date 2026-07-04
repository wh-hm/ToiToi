import { NextRequest, NextResponse } from "next/server";
import { updateTask, deleteTask } from "@/services/TaskService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";
const safeRegex = /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF01-\uFF5E]/;

// 1. PATCH: タスク更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const taskId = Number(id);
    const { title, description, due_date, space_id, tag, is_allday, priority, status } = await request.json();

    // --- 単体チェック ---
    if (!title) return NextResponse.json({ message: MESSAGES.E1001("タスク名") }, { status: 400 });
    if (!due_date) return NextResponse.json({ message: MESSAGES.E1001("期限") }, { status: 400 });
    if (!description) return NextResponse.json({ message: MESSAGES.E1001("詳細") }, { status: 400 });

    if (title.length > 20) return NextResponse.json({ message: MESSAGES.E1002("タスク名", 20) }, { status: 400 });
    if (description.length > 100) return NextResponse.json({ message: MESSAGES.E1002("詳細", 100) }, { status: 400 });

    if (safeRegex.test(title) || safeRegex.test(description)) {
      return NextResponse.json({ message: MESSAGES.E1003("タスク名または詳細", "記号") }, { status: 400 });
    }

    if (isNaN(new Date(due_date).getTime())) {
      return NextResponse.json({ message: MESSAGES.E1004 }, { status: 400 });
    }

    const updated = await updateTask(taskId, auth.user_id, title, description, due_date, space_id, tag, is_allday, priority, status);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2002("タスク") }, { status: 500 });
  }
}

// 2. DELETE: タスク削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  

  try {
    const { id } = await params;
    // DELETEメソッドではボディを読み取らないのが安全なため、クエリパラメータから取得を推奨します
    const { searchParams } = new URL(request.url);
    const space_id = Number(searchParams.get("space_id"));

    if (!space_id || isNaN(space_id)) return NextResponse.json({ message: MESSAGES.E1001("スペースID") }, { status: 400 });

    const success = await deleteTask(Number(id), auth.user_id, space_id);
    if (!success) return NextResponse.json({ message: MESSAGES.E2004("タスク") }, { status: 500 });

    return NextResponse.json({ message: MESSAGES.S1003("タスク") });
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2004("タスク") }, { status: 500 });
  }
}