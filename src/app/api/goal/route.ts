import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-guard";
import { MESSAGES } from "@/constants/messages";

const safeRegex =
  /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF01-\uFF5E]/;

export async function PATCH(request: Request) {
  // 認証
  const auth = await getAuthContext();
  if ("error" in auth) {
    return NextResponse.json(
      { message: auth.error },
      { status: auth.status }
    );
  }

  try {
    const { content } = await request.json();

    // 必須チェック
    if (!content || !content.trim()) {
      return NextResponse.json(
        { message: MESSAGES.E1001("目標") },
        { status: 400 }
      );
    }

    // 文字数
    if (content.length > 100) {
      return NextResponse.json(
        { message: MESSAGES.E1002("目標", 100) },
        { status: 400 }
      );
    }
    // 使用禁止文字
    if (safeRegex.test(content)) {
      return NextResponse.json(
        { message: MESSAGES.E1003("目標", "使用できない文字") },
        { status: 400 }
      );
    }
    const deletedAt = new Date();
    deletedAt.setDate(deletedAt.getDate() + 7);

    const goal = await prisma.goal.upsert({
      where: {
        id: auth.user_id,
      },
      update: {
        content,
        delete_flag: 0,
        deleted_at: deletedAt,
      },
      create: {
        id: auth.user_id,
        content,
        status: 0,
        delete_flag: 0,
        created_at: new Date(),
        deleted_at: deletedAt,
      },
    });
    return NextResponse.json(goal);
  } catch (error) {
    console.error("目標更新エラー:", error);

    return NextResponse.json(
      {
        message: MESSAGES.E2002("目標"),
      },
      { status: 500 }
    );
  }
}