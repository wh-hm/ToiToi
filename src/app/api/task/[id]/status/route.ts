import { NextRequest, NextResponse } from "next/server";
import { getTaskCheck, updateStatusTask } from "@/services/TaskService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";
import { getSpaceCheck } from "@/services/SpaceService";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id?: string; spaceId?: string }> }
) {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  
  try {
    const resolvedParams = await params;
    const body = await request.json();
    
    // 💡 キャメルケースに統一。paramsとbodyのどちらから送られてきても取得できるように安全にフォールバックを設定
    const taskId = Number(resolvedParams.id || body.taskId || body.task_id);
    const spaceIdNum = Number(resolvedParams.spaceId || body.spaceId || body.space_id);
    const { status } = body;

    // 必須チェック (💡 0が送られてきても弾かれないロジックを維持)
    if (status === undefined || !spaceIdNum || isNaN(spaceIdNum) || !taskId || isNaN(taskId)) {
      return NextResponse.json({ message: MESSAGES.E1001("ステータス、スペースID、またはタスクID") }, { status: 400 });
    }

    const [isSpaceAlive, isTaskAlive] = await Promise.all([
      getSpaceCheck(auth.user_id, spaceIdNum), 
      getTaskCheck(auth.user_id, spaceIdNum, taskId)
    ]);

    // スペースチェックの判定
    if (!isSpaceAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    }

    if (!isTaskAlive) {
        return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });
    }

    // 更新処理 (キャメルケースの変数で実行)
    const updatedTask = await updateStatusTask(
      taskId,
      spaceIdNum,
      auth.user_id,
      status
    );

    if (!updatedTask) {
      return NextResponse.json({ message: MESSAGES.E2002("タスクステータス") }, { status: 500 });
    }

    // 💡 mainブランチで追加された「成功メッセージ付きレスポンス（キャメルケース）」を反映
    return NextResponse.json({ 
        updatedTask: updatedTask, 
        message: MESSAGES.S1002("タスクステータス") 
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2002("タスクステータス") }, { status: 500 });
  }
}