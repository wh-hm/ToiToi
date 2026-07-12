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
    
    // ボディからの値取得 (💡設計書に合わせて spaceId に変更)
    const body = await request.json();
    const { status, spaceId } = body;

    const spaceIdNum = Number(spaceId);

    // 必須チェック (💡 0が送られてきても弾かれないように修正)
    if (status === undefined || !spaceId || isNaN(spaceIdNum)) {
      return NextResponse.json({ message: MESSAGES.E1001("ステータスまたはスペースID") }, { status: 400 });
    }

    const [isSpaceAlive, isTaskAlive] = await Promise.all([
      getSpaceCheck(auth.user_id, spaceIdNum), 
      getTaskCheck(auth.user_id, spaceIdNum, taskId) // 💡 Number(id)をtaskIdに変えてスッキリ
    ]);

    // スペースチェックの判定
    if (!isSpaceAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    }

    if (!isTaskAlive) {
        return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });
    }

    // 更新処理 (💡 サービス層の引数の順番が spaceIdNum かどうか確認してください)
    const updated = await updateStatusTask(
      taskId,
      spaceIdNum, // 💡 サービスに渡す
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