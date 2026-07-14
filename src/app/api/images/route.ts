// app/api/images/route.ts
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { deleteImages, getAuthorizedImageIds, getImages } from "@/services/StorageService"; // ストレージサービスと仮定
import { MESSAGES } from "@/constants/messages";
import { getSpaceCheck } from "@/services/SpaceService";
import { checkQuestionChat } from "@/services/QuestionChatService";
import { getChatCheck } from "@/services/ChatService";
import { prisma } from "@/lib/prisma";


export async function DELETE() {
  // 1. 認証チェック
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    // 1. 物理削除すべき画像IDリストを取得
    const imageIds = await getAuthorizedImageIds(auth.user_id);
    if (imageIds.length > 0) {
      // 2. 物理削除を実行 (R2ファイル削除 + Imageレコード削除)
      await deleteImages(imageIds); 
    }
    // 3. 【重要】紐付いているチャット側のフラグも「削除」にする
    // 画像だけでなく、チャットメッセージ自体を「見えない状態」にする
    await prisma.$transaction([
      prisma.chat.updateMany({
        where: { user_id: auth.user_id, delete_flag: 0 },
        data: { delete_flag: 1 }
      }),
      prisma.questionChats.updateMany({
        where: { user_id: auth.user_id, delete_flag: 0 },
        data: { delete_flag: 1 }
      })
    ]);

    return NextResponse.json({ 
        success: true, 
        message: MESSAGES.S1004("画像とチャット") 
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2004("画像") }, { status: 500 });
  }
}


const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT, // Cloudflare R2 のエンドポイント
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storageKey, spaceId, type, chatId, questionId } = body;

    // 1. 基本バリデーション：Blobは絶対に通さない（クライアント側で防ぐのが理想だがサーバーでも厳守）
    if (!storageKey || typeof storageKey !== 'string' || storageKey.startsWith('blob:')) {
      return NextResponse.json({ message: "不正な画像リクエストです" }, { status: 400 });
    }

    // 2. 認証チェック
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

    // 3. 権限・生存チェック（並列化）
    const sId = parseInt(spaceId);
    const cId = parseInt(chatId);
    const qId = questionId ? parseInt(questionId) : null;
    const checkTasks = [];

    if (type === "chat") {
      checkTasks.push(getSpaceCheck(auth.user_id, sId));
      checkTasks.push(getChatCheck(auth.user_id, sId, cId));
    } else if (type === "question") {
      if (!qId) return NextResponse.json({ message: MESSAGES.E1008 }, { status: 400 });
      checkTasks.push(getSpaceCheck(auth.user_id, sId));
      checkTasks.push(checkQuestionChat(cId, qId, auth.user_id));
    }

    const [isSpaceAlive, isChatAlive] = await Promise.all(checkTasks);

    if (!isSpaceAlive) return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    if (!isChatAlive) return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });

    // 4. R2からダウンロード実行
    // フロントから送られてきた storageKey をそのまま信頼してキーとして使用する
    const key = decodeURIComponent(storageKey);
    console.log("R2に送るKey:", key);

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    const response = await s3Client.send(command);
    
    // 5. レスポンス返却
    return new Response(response.Body as ReadableStream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(key.split('/').pop() || "download.png")}"`,
      },
    });
  } catch (error) {
    console.error("R2ダウンロードエラー:", error);
    return NextResponse.json({ message: "画像が見つかりません" }, { status: 404 });
  }
}