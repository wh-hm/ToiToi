import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // あなたのPrismaクライアントのインポートパスに合わせてください

export async function GET(request: Request) {
  // URLから googleId を取得
    const { searchParams } = new URL(request.url);
    const googleId = searchParams.get("googleId");

    if (!googleId) {
        return NextResponse.json({ hasUsername: false });
    }

    try {
        // DBからユーザーを検索
        const user = await prisma.user.findFirst({
        where: { google_id: googleId },
        });

        // ユーザーが存在し、かつ username が null や空文字ではないか判定
        const hasUsername = !!user && !!user.username && user.username.trim() !== "";

        return NextResponse.json({ hasUsername });
    } catch (error) {
        console.error("ユーザー確認エラー:", error);
        return NextResponse.json({ hasUsername: false }, { status: 500 });
    }
}