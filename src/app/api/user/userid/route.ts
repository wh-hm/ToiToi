import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // ① セッション情報から安全に値を取得
    const userEmail = session?.user?.email;
    const sessionId = (session?.user as any)?.id;

    if (!userEmail && !sessionId) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    const { user_id } = await request.json();

    if (!user_id || typeof user_id !== "string") {
      return NextResponse.json({ error: "無効なID形式です" }, { status: 400 });
    }

    // ② 抽出した変数を使って更新対象のユーザーを特定
    let currentUser = null;
    if (userEmail) {
      currentUser = await prisma.user.findFirst({ where: { email: userEmail } });
    }
    if (!currentUser && sessionId) {
      const strSessionId = String(sessionId);
      currentUser = await prisma.user.findFirst({
        where: { OR: [{ id: strSessionId }, { google_id: strSessionId }] },
      });
    }

    if (!currentUser) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    // ③ ユーザー情報の更新
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: { user_id },
    });

    return NextResponse.json(
      { message: "招待用IDを更新しました", user: updatedUser },
      { status: 200 }
    );
    
  } catch (error: any) {
    console.error("ユーザーID更新エラー:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "このIDはすでに他のユーザーに使用されています。別のIDをお試しください。" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}