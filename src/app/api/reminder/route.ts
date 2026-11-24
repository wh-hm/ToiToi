import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { getAndTriggerReminders, createReminder } from "@/services/ReminderService";

// GET: 期限到来のリマインドを送信済みに更新し、一覧を取得
export async function GET() {
  const auth = await getAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    const reminders = await getAndTriggerReminders(auth.user_id);
    return NextResponse.json({ reminders, message: "リマインドを取得しました" });
  } catch (error) {
    console.error("GET Reminder Error:", error);
    return NextResponse.json({ message: "リマインドの取得に失敗しました" }, { status: 500 });
  }
}

// POST: リマインド登録
export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { task_id, remind_at, content, space_type } = body;

    if (!task_id || !remind_at) {
      return NextResponse.json({ message: "タスクIDとリマインド日時は必須です" }, { status: 400 });
    }

    const remindDate = new Date(remind_at);
    if (isNaN(remindDate.getTime())) {
      return NextResponse.json({ message: "リマインド日時の形式が不正です" }, { status: 400 });
    }

    const reminder = await createReminder({
      userId: auth.user_id,
      taskId: Number(task_id),
      remindAt: remindDate,
      content: content || "タスクの期限が近づいています",
      spaceType: space_type ? Number(space_type) : 2,
    });

    return NextResponse.json({ reminder, message: "リマインドを登録しました" }, { status: 201 });
  } catch (error) {
    console.error("POST Reminder Error:", error);
    return NextResponse.json({ message: "リマインドの登録に失敗しました" }, { status: 500 });
  }
}