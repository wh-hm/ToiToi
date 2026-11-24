// src/app/api/cron/reminders/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const result = await prisma.reminder.updateMany({
      where: {
        remind_at: { lte: now },
        is_sent: 0,
        delete_flag: 0,
      },
      data: {
        is_sent: 1,
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      message: `${result.count}件のリマインドを送信済みにしました`,
    });
  } catch (error) {
    console.error("Cron Reminder Error:", error);
    return NextResponse.json({ message: "リマインド送信処理に失敗しました" }, { status: 500 });
  }
}