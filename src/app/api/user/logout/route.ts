// app/api/user/logout/route.ts
import { getAuthContext } from "@/lib/auth-guard";
import { NextResponse } from "next/server";

export async function POST() {
   const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  

  // ここでセッションを破棄する処理やクッキー削除処理などを入れる
  // NextAuthの場合はフロント側でsignOutすることが多いですが、
  // バックエンドで明示的に制御したい場合はここに処理を書きます。

  return NextResponse.json({ message: "ログアウトしました" });
}