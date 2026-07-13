import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { getChatsWithImages, registerChat } from "@/services/ChatService";
import { uploadImages } from "@/services/StorageService";
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
    const caption = formData.get("caption") as string | null; // 追加

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

    if(files.length > 5){
        return NextResponse.json({ message: MESSAGES.E1006 }, { status: 400 });
    }

    console.log("受け取ったファイル数:", files.length);
    // 3. 画像アップロード
    if (files.length > 0) {
    console.log("ファイル名:", files[0].name);

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
      console.log("uploadImagesの戻り値:", imageUrls);
    }
    // 4. DB登録 (ループで1枚ずつ登録)
    const newChat = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 画像がない場合
      if (!imageUrls || imageUrls.length === 0) {
        const res = await registerChat({
          userId: auth.user_id,
          spaceId: spaceId,
          message: message || undefined,
          stamp: stamp || undefined,
        }, tx);
        return [res]; // ★単一の結果も必ず配列 [res] にして返す
      }
      // 画像がある場合
      const results = [];
      for (let i = 0; i < imageUrls.length; i++) {
        const res = await registerChat({
          userId: auth.user_id,
          spaceId: spaceId,
          message: message || undefined,
          imageUrl: imageUrls[i],
          caption: caption || undefined, // キャプションを渡す
          stamp: i === 0 ? (stamp || undefined) : undefined,
        }, tx); // tx を渡す
        results.push(res);
      }
      return results; // これは元から配列
    });
    console.log("最終確認:", newChat);
    const safeNewChat = JSON.parse(JSON.stringify(newChat));
    // ここで newChat は常に配列として返る。チャットのため成功時のメッセージは送らない
    return NextResponse.json({ newChat: safeNewChat , message: MESSAGES.S1001("チャット") }, { status: 201 });


  } catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': // 既存データの重複 (Unique constraint)
        return NextResponse.json({ message: MESSAGES.E4009 }, { status: 409 });
        
      case 'P2025': // 削除や更新対象のレコードがいない
        return NextResponse.json({ message: MESSAGES.E2005("対象データ") }, { status: 404 });
        
      case 'P2003': // 外部キー制約 (削除しようとしたが紐づくデータがある等)
        return NextResponse.json({ message: "このデータは他の機能で使用されているため削除できません。" }, { status: 400 });
        
      case 'P2011': // Null制約 (必須項目抜け)
        return NextResponse.json({ message: MESSAGES.E1001("必須項目") }, { status: 400 });

      default:
        console.error("Prisma Error:", error.code, error.message);
        return NextResponse.json({ message: MESSAGES.E2001("システム") }, { status: 500 });
    }
  }
    // return NextResponse.json({ message: MESSAGES.E2001("チャット") }, { status: 500 });

  // Prisma以外の予期せぬエラー
  return NextResponse.json({ message: MESSAGES.E2003("通信") }, { status: 500 });
}
}