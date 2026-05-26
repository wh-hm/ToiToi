import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextRequest, NextResponse } from "next/server";
import { updateLoginManagement } from "@/services/LoginManagementService";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/services/UserService";
export async function POST() {
  const session = await getServerSession(authOptions);
  
  // 1. セッションチェック
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. ユーザーIDの取得
  const userId = await getUserId(session.user.id);

  // 3. ユーザーが存在しない場合、ここで終了させる（超重要！）
  if (!userId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    // 4. 管理サービスの実行
    // ※ 内部で prisma を使って streak 更新を行う
    await updateLoginManagement(prisma, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}