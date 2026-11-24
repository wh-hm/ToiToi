import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-guard";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reminderId: string }> }
) {
  const auth = await getAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    const { reminderId } = await params;
    const id = Number(reminderId);
    const body = await request.json(); // { status?: number, is_read?: number }

    const updated = await prisma.reminder.update({
      where: {
        id,
        user_id: auth.user_id,
        delete_flag: 0,
      },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.is_read !== undefined && { is_read: body.is_read }),
      },
    });

    return NextResponse.json({ reminder: updated, message: "リマインドを更新しました" });
  } catch (error) {
    console.error("PATCH Reminder Error:", error);
    return NextResponse.json({ message: "リマインドの更新に失敗しました" }, { status: 500 });
  }
}