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
    
    // 規約に基づき成功時も message を返却します
    return NextResponse.json({ 
      success: true, 
      message: MESSAGES.S1002("最終ログイン情報") 
    }, { status: 200 });
    
  } catch (error) {
    console.error("最終ログイン更新エラー:", error);

    return NextResponse.json(
      { 
        success: false, // 一貫性のため成功時と同様に含めるか、省略可能です
        message: MESSAGES.E2002("最終ログイン情報") 
      },
      { status: 500 }
    );
  }
}