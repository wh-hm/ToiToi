import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { getChatsWithImages, registerChat } from "@/services/ChatService";
import { uploadImages, deleteImage } from "@/services/StorageService";
import { MESSAGES } from "@/constants/messages";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSpaceCheck, getSpaceName } from "@/services/SpaceService";



// 1. GET: チャット一覧取得
export async function GET(request: NextRequest) {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const spaceId = Number(searchParams.get("spaceId"));

    if (!spaceId || isNaN(spaceId)) {
        return NextResponse.json({ message: MESSAGES.E1001("スペースID") }, { status: 400 });
    }

    try {
        const isSpaceAlive = await getSpaceCheck(auth.user_id, spaceId);
        
        if (!isSpaceAlive) {
            return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
        }
      
        const [spaceName, chats] = await Promise.all([
            getSpaceName(auth.user_id, spaceId),
            getChatsWithImages(auth.user_id, spaceId)
        ]);

        if (!spaceName) {
            return NextResponse.json({ message: MESSAGES.E1010("スペース名") }, { status: 404 });
        }
        
        return NextResponse.json({ 
            spaceName: spaceName, 
            chats: chats, 
            message: MESSAGES.S2001("チャット履歴") 
        },{ status: 200});
    } catch (error) {
        console.error("GET API Error:", error);
        return NextResponse.json({ message: MESSAGES.E2003("チャット") }, { status: 500 });
    }
}


export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  // 1. 変数を用意（配列に変更）
  let imageUrls: string[] | undefined;

  try {
    
    const formData = await request.formData();
    const message = formData.get("message") as string;
    const files = formData.getAll("images") as File[];
    const spaceId = Number(formData.get("spaceId"));
    const stamp = formData.get("stamp") as string | null;

    const isSpaceAlive = await getSpaceCheck(auth.user_id, spaceId);
      
    if (!isSpaceAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    }

    // 2. バリデーションチェック
    if (!message && files.length === 0 && !stamp) {
      return NextResponse.json({ message: MESSAGES.E1001("チャット内容") }, { status: 400 });
    }
    if (message && message.trim() === "") {
      return NextResponse.json({ message: MESSAGES.E1001("チャット内容") }, { status: 400 });
    }
    if (message && message.length > 100) {
      return NextResponse.json({ message: MESSAGES.E1002("チャット内容", 100) }, { status: 400 });
    }

    console.log(files);

    if(files.length > 5){
        return NextResponse.json({ message: MESSAGES.E1006 }, { status: 400 });
    }

    // 3. 画像アップロード
    if (files.length > 0) {

      const MAX_FILE_SIZE = 2 * 1024 * 1024;
      // 全ファイルのバリデーション
      for (const [index, file] of files.entries()) {
        if(file.size === 0){
          return NextResponse.json({ message: MESSAGES.E1012(index + 1)},{ status: 400 });
        }
        if (file.size > MAX_FILE_SIZE || !["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
          return NextResponse.json({ message: MESSAGES.E1005(index + 1) }, { status: 400 });
        }
      }

      
      imageUrls = await uploadImages(files, auth.user_id, spaceId);
    }

    // 4. DB登録 (ループで1枚ずつ登録)
    const newChat = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 画像がない場合
      if (!imageUrls || imageUrls.length === 0) {
        const res = await registerChat({
          user_id: auth.user_id,
          space_id: spaceId,
          message: message || undefined,
          stamp: stamp || undefined,
        }, tx);
        return [res]; // ★単一の結果も必ず配列 [res] にして返す
      }

      // 画像がある場合
      const results = [];
      for (let i = 0; i < imageUrls.length; i++) {
        const res = await registerChat({
          user_id: auth.user_id,
          space_id: spaceId,
          message: message || undefined,
          image_url: imageUrls[i],
          stamp: i === 0 ? (stamp || undefined) : undefined,
        }, tx);
        results.push(res);
      }
      return results; // これは元から配列
    });
    // ここで newChat は常に配列として返る。チャットのため成功時のメッセージは送らない
    return NextResponse.json({ newChat: newChat, message: MESSAGES.S1001("チャット") }, { status: 201 });


  } catch (error) {
    // 5. エラー処理（配列対応）
    if (imageUrls && imageUrls.length > 0) {
      for (const url of imageUrls) {
        await deleteImage(url).catch(e => console.error("削除失敗:", e));
      }
    }
    return NextResponse.json({ message: MESSAGES.E2001("チャット") }, { status: 500 });
  }
}