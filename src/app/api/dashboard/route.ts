import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { getSpaces } from "@/services/SpaceService";
import { MESSAGES } from "@/constants/messages";

export async function GET() {
  // 1. 認証ガードで認証済みIDを直接取得
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    // 2. 認証済みID (auth.user_id) を使ってスペースを取得
    const spaces = await getSpaces(auth.user_id);

    // 3. 型ごとのフィルタリング
    const result = {
      type1: spaces.filter(s => s.space_type === 1),
      type2: spaces.filter(s => s.space_type === 2),
      type3: spaces.filter(s => s.space_type === 3),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("スペース取得エラー:", error);
    return NextResponse.json({ error: MESSAGES.E2001("スペース取得") }, { status: 500 });
  }
}