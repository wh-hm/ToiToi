// app/api/images/route.ts
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
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


const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT, // Cloudflare R2 のエンドポイント
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
export async function POST(req: Request) {
  const { targetUrl } = await req.json();
  
  // 1. 認証チェック
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // 2. URL から Key を特定
  const url = new URL(targetUrl);
  // URLの先頭が "/" で始まる場合は削除する
  const key = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;

  // 3. R2から取得
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    const response = await s3Client.send(command);
    
    // 4. ストリームとしてレスポンスを返す
    return new Response(response.Body as ReadableStream, {
      headers: {
        // ここを image/png から application/octet-stream に変えるのが最大の対策です
        "Content-Type": "application/octet-stream", 
        "Content-Disposition": 'attachment; filename="download.png"',
      },
    });
  } catch (error) {
    console.error("R2 fetch error:", error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}