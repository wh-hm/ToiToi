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
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // 1. Key を特定するロジックを強化
  let key = targetUrl;
  if (targetUrl.startsWith('blob:')) {
     // ここで「どうやってblobからファイル名を復元するか」を考える必要があります
     // 一番良いのは、コンポーネント側で msg.image_url (DBのファイル名) を渡すことです
     console.error("エラー: blob: URLが渡されています");
     return NextResponse.json({ error: "Invalid file reference" }, { status: 400 });
  }
  try {
    // URLの形式になっているか確認（httpで始まる場合）
    if (targetUrl.startsWith('http')) {
      const url = new URL(targetUrl);
      // pathname から先頭の / を削る
      key = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    }
  } catch (e) {
    // URLとして解釈できない場合は、そのままファイル名として扱う
    console.warn("URLとしての解析はスキップされました:", targetUrl);
  }

  // デバッグ用ログ：ここが重要です！
  console.log("R2に送るKey:", key);

  // 3. R2から取得
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key, // ここが正しければ取得できる
    });
    
    const response = await s3Client.send(command);
    
    return new Response(response.Body as ReadableStream, {
      headers: {
        "Content-Type": "application/octet-stream", 
        "Content-Disposition": 'attachment; filename="download.png"',
      },
    });
  } catch (error) {
    console.error("R2 fetch error for key:", key, error);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}