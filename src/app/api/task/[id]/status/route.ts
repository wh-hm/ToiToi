import { NextRequest, NextResponse } from "next/server";
import { getTaskCheck, updateStatusTask } from "@/services/TaskService";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";
import { getSpaceCheck } from "@/services/SpaceService";
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const taskId = Number(id);
    
    // ボディからの値取得
    const body = await request.json();
    const { status, space_id } = body;

    // 必須チェック (statusとspace_idは更新に必須とする)
    if (status === undefined || !space_id) {
      return NextResponse.json({ message: MESSAGES.E1001("ステータスまたはスペースID") }, { status: 400 });
    }

    const [isSpaceAlive, isTaslAlive] = await Promise.all([
      getSpaceCheck(auth.user_id, space_id), // ※関数名が推測ですが合わせる
      getTaskCheck(auth.user_id, space_id, Number(id))
    ]);

    // スペースチェックの判定
    if (!isSpaceAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    }

    if (!isTaslAlive) {
        return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });
    }

    // 更新処理
    const updated = await updateStatusTask(
      taskId,
      space_id,
      auth.user_id,
      status
    );

    if (!updated) {
      return NextResponse.json({ message: MESSAGES.E2002("タスクステータス") }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2002("タスクステータス") }, { status: 500 });
  }
}