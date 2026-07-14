import { NextRequest, NextResponse } from "next/server";
import { updateTask, deleteTask, getTaskCheck } from "@/services/TaskService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";
import { getSpaceCheck } from "@/services/SpaceService";
const safeRegex = /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF01-\uFF5E]/;

//  PATCH 関数
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    // 1. URLパス（/api/task/[id]）から確実にタスクIDを取得
    const { id } = await params;
    const taskId = Number(id); 

    // 2. リクエストボディからデータを取得（※ここから taskId は除外します！）
    const { title, description, dueDate, tag, isAllday, priority, status, spaceId } = await request.json();
    const spaceIdNum = Number(spaceId);

    // ログで値が正常か確認（「result null」の前の数値が正しいかチェック用）
    console.log("【デバッグ】", auth.user_id, "Space:", spaceIdNum, "Task:", taskId);

    // --- 単体チェック ---
    if (!title) return NextResponse.json({ message: MESSAGES.E1001("タスク名") }, { status: 400 });
    if (!dueDate) return NextResponse.json({ message: MESSAGES.E1001("期限") }, { status: 400 });
    if (!description) return NextResponse.json({ message: MESSAGES.E1001("詳細") }, { status: 400 });

    if (isNaN(spaceIdNum) || isNaN(taskId)) {
      return NextResponse.json({ message: "不正なスペースIDまたはタスクIDです。" }, { status: 400 });
    }

    if (title.length > 20) return NextResponse.json({ message: MESSAGES.E1002("タスク名", 20) }, { status: 400 });
    if (description.length > 100) return NextResponse.json({ message: MESSAGES.E1002("詳細", 100) }, { status: 400 });

    if (safeRegex.test(title) || safeRegex.test(description)) {
      return NextResponse.json({ message: MESSAGES.E1003("タスク名または詳細", "記号") }, { status: 400 });
    }

    if (isNaN(new Date(dueDate).getTime())) {
      return NextResponse.json({ message: MESSAGES.E1004 }, { status: 400 });
    }

    const [isSpaceAlive, isTaskAlive] = await Promise.all([
        getSpaceCheck(auth.user_id, spaceIdNum), // ※関数名が推測ですが合わせる
        getTaskCheck(auth.user_id, spaceIdNum, taskId)
    ]);
    // スペースチェックの判定
    if (!isSpaceAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    }
    if (!isTaskAlive) {
        return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });
    }
    const updatedTask = await updateTask(taskId, auth.user_id, title, description, dueDate, spaceIdNum, tag, isAllday, priority, status);
    return NextResponse.json({ updatedTask: updatedTask, message: MESSAGES.S1001("タスク") });
  } catch (error) {
    console.error("PATCHタスクエラー詳細:", error);
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
    const taskId = Number(searchParams.get("taskId"));
    
    const spaceIdNum = Number(id);
    if (!spaceIdNum || isNaN(spaceIdNum)) return NextResponse.json({ message: MESSAGES.E1001("スペースID") }, { status: 400 });

    if (!taskId || isNaN(taskId)) return NextResponse.json({ message: MESSAGES.E1001("タスクID") }, { status: 400 });
    const [isSpaceAlive, isTaskAlive] = await Promise.all([
        getSpaceCheck(auth.user_id, spaceIdNum), // ※関数名が推測ですが合わせる
        getTaskCheck(auth.user_id, spaceIdNum, taskId)
    ]);
    // スペースチェックの判定
    if (!isSpaceAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    }
    if (!isTaskAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("タスク") }, { status: 409 });
    }
    const success = await deleteTask(taskId, auth.user_id, spaceIdNum);
    if (!success) return NextResponse.json({ message: MESSAGES.E2004("タスク") }, { status: 500 });

    return NextResponse.json({ success: true, message: MESSAGES.S1003("タスク") });
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2004("タスク") }, { status: 500 });
  }
}
