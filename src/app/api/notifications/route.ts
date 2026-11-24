import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
} from "@/services/NotificationService";

// GET: 通知一覧取得
export async function GET() {
  const auth = await getAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status });
  }

  try {
    const { notifications, unreadCount } = await getNotifications(auth.user_id);
    return NextResponse.json({ notifications, unreadCount }, { status: 200 });
  } catch (error) {
    console.error("通知取得エラー:", error);
    return NextResponse.json({ error: "通知の取得に失敗しました" }, { status: 500 });
  }
}

// PATCH: 通知を既読にする（個別 / 一括）
export async function PATCH(request: NextRequest) {
  const auth = await getAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const notificationId = body.notificationId ? Number(body.notificationId) : undefined;

    await markNotificationAsRead(auth.user_id, notificationId);
    return NextResponse.json({ message: "既読にしました" }, { status: 200 });
  } catch (error) {
    console.error("通知既読更新エラー:", error);
    return NextResponse.json({ error: "既読の更新に失敗しました" }, { status: 500 });
  }
}

// DELETE: 通知を非表示（論理削除）にする
export async function DELETE(request: NextRequest) {
  const auth = await getAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const notificationId = Number(idParam);

    if (!notificationId || isNaN(notificationId)) {
      return NextResponse.json({ error: "通知IDが不正です" }, { status: 400 });
    }

    await deleteNotification(auth.user_id, notificationId);
    return NextResponse.json({ message: "通知を削除しました" }, { status: 200 });
  } catch (error) {
    console.error("通知削除エラー:", error);
    return NextResponse.json({ error: "通知の削除に失敗しました" }, { status: 500 });
  }
}