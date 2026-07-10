// app/api/user/login-update/route.ts
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { updateLoginManagement} from "@/services/LoginManagementService";
import { MESSAGES } from "@/constants/messages";

export async function PATCH() {
  const auth = await getAuthContext();
  if ('error' in auth) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }
  try {
    await updateLoginManagement(auth.user_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("最終ログイン更新エラー:", error);

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}