import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { getChatsWithImages, registerChat } from "@/services/ChatService";
import { uploadImage, deleteImage } from "@/services/StorageService";
import { MESSAGES } from "@/constants/messages";
import { prisma } from "@/lib/prisma";

// 1. GET: チャット一覧取得
export async function GET(request: NextRequest) {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const spaceId = Number(searchParams.get("spaceId"));

    if (!spaceId || isNaN(spaceId)) {
        return NextResponse.json({ error: MESSAGES.E1001("スペースID") }, { status: 400 });
    }

    try {
        const questions = await getChatsWithImages(auth.user_id, spaceId);
        return NextResponse.json(questions);
    } catch (error) {
        return NextResponse.json({ error: MESSAGES.E2003("チャット") }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // 1. まず変数を用意（スコープを広げるため）
  let imageUrl: string | undefined;

  try {
    const formData = await request.formData();
    const message = formData.get("message") as string;
    const file = formData.get("image") as File | null;
    const space_id = Number(formData.get("space_id"));
    const stamp = formData.get("stamp") as string | null;

    // 2. バリデーションチェック
    if (!message && !file && !stamp) {
      return NextResponse.json({ error: MESSAGES.E1001("チャット内容") }, { status: 400 });
    }
    if (message && message.length > 100) {
      return NextResponse.json({ error: MESSAGES.E1002("チャット内容", 100) }, { status: 400 });
    }

    // 3. 画像アップロード
    if (file) {
      if (file.size > 2 * 1024 * 1024 || !["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
        return NextResponse.json({ error: MESSAGES.E1005 }, { status: 400 });
      }
      imageUrl = await uploadImage(file, auth.user_id, space_id);
    }

    // 4. DB登録 (トランザクション内)
    const newChat = await prisma.$transaction(async (tx) => {
      return await registerChat({
        user_id: auth.user_id,
        space_id: space_id,
        message: message || undefined,
        image_url: imageUrl,
        stamp: stamp || undefined,
      }, tx);
    });

    return NextResponse.json({ newChat }, { status: 201 });

  } catch (error) {
    // 5. エラー処理（ここで全ての予期せぬエラーをキャッチ）
    if (imageUrl) {
      console.error("エラー発生。アップロード済みの画像を削除します:", imageUrl);
      await deleteImage(imageUrl).catch(e => console.error("削除失敗:", e));
    }
    console.error("API処理エラー:", error);
    return NextResponse.json({ error: MESSAGES.E2001("チャット") }, { status: 500 });
  }
}