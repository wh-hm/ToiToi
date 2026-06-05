import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { deleteUser } from "@/services/UserService";
import { MESSAGES } from "@/constants/messages";

export async function DELETE(request: NextRequest) {
  // 1. 認証とユーザーID取得を共通化
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    // 2. ユーザー削除（論理削除）の実行
    const success = await deleteUser(auth.user_id);
    
    if (!success) {
      // 削除対象が見つからない、または権限がない場合
      return NextResponse.json({ error: MESSAGES.E2001("ユーザー削除") }, { status: 404 });
    }

    return NextResponse.json({ message: "ユーザーを削除しました" });
  } catch (error) {
    console.error("【ユーザー削除エラー】", error);
    return NextResponse.json({ error: MESSAGES.E2001("ユーザー削除") }, { status: 500 });
  }
}