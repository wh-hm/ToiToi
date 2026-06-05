// app/api/user/login-update/route.ts
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { updateLoginManagement} from "@/services/LoginManagementService";
import { MESSAGES } from "@/constants/messages";

export async function POST() {
  // 1. 認証とユーザーID取得を1行で
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    // 2. 最終ログイン日時を更新
    await updateLoginManagement(auth.user_id);

    return NextResponse.json({ message: MESSAGES.S1002 });
  } catch (error) {
    console.error("最終ログイン更新エラー:", error);
    return NextResponse.json({ error: MESSAGES.E2001("最終ログイン更新") }, { status: 500 });
  }
}