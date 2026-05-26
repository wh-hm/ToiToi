import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { updateStatusTask } from "@/services/TaskService";
import { getUserId } from "@/services/UserService";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id);

    // 1. セッションとユーザーID確認
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "認証なし" }, { status: 401 });
    const user_id = await getUserId(session.user.id);

    // 2. Bodyの読み込み（失敗したら空オブジェクトにする）
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      console.error("JSON読み込み失敗:", e);
    }

    // 3. データの取り出し (bodyがundefinedでも落ちないように)
    // フロントから送られてきた値を優先し、なければDBから今の値を取得する
    const status = (body as any)?.status;
    let space_id = (body as any)?.space_id;

    if (!space_id) {
      const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
      space_id = existingTask?.space_id;
    }

    // 4. 更新処理
    const updated = await updateStatusTask(taskId, {
      user_id: user_id,
      space_id: space_id,
      status: status,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("ステータス更新エラーの詳細:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}