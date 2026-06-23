// app/api/images/route.ts
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { deleteImages } from "@/services/StorageService"; // ストレージサービスと仮定
import { MESSAGES } from "@/constants/messages";

export async function DELETE(request: Request) {
  // 1. 認証チェック
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    await deleteImages(auth.user_id);

    return NextResponse.json({ message: "画像を一括削除しました" });
  } catch (error) {
    console.error("画像一括削除エラー:", error);
    return NextResponse.json({ error: MESSAGES.E2001("画像削除") }, { status: 500 });
  }
}
