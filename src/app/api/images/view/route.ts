// app/api/images/view/route.ts
import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getAuthContext } from "@/lib/auth-guard";
import { getSpaceCheck } from "@/services/SpaceService";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;

export async function GET(req: Request) {
  try {
    // 💡 URLからパラメータ（key と spaceId）を抜き出す
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("key");
    const spaceIdStr = searchParams.get("spaceId");

    if (!targetUrl || !spaceIdStr) {
      return NextResponse.json({ message: "不正なリクエストです" }, { status: 400 });
    }

    const spaceId = parseInt(spaceIdStr, 10);

    // 🔒 1. ログインチェック
    const auth = await getAuthContext();
    if ("error" in auth) {
      return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    // 🔒 2. スペース所属チェック（別スペースの人間ならここで即弾く！）
    const hasPermission = await getSpaceCheck(auth.user_id, spaceId);
    if (!hasPermission) {
      return NextResponse.json({ message: "この画像を閲覧する権限がありません" }, { status: 403 });
    }

    // 3. Blob URL（送信中ローカル画像）の場合はここでは処理できないのでエラー
    if (targetUrl.startsWith("blob:")) {
      return NextResponse.json({ message: "無効なURL形式です" }, { status: 400 });
    }

    // 4. R2用の Key を特定
    let key = targetUrl;
    if (targetUrl.startsWith("http")) {
      const url = new URL(targetUrl);
      key = url.pathname.startsWith("/") ? url.pathname.substring(1) : url.pathname;
    }

    // 5. R2（Cloudflare R2 / S3）から画像バイナリを取得
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    const response = await s3Client.send(command);

    // 6. 拡張子から適切な Content-Type を判定（画像が壊れないようにするため）
    const ext = key.split(".").pop()?.toLowerCase();
    let contentType = "image/png"; // デフォルト
    if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
    if (ext === "gif") contentType = "image/gif";
    if (ext === "webp") contentType = "image/webp";

    // ✨ 【超重要】"inline" にすることで、ダウンロードさせずに画面に「表示」させる！
    return new Response(response.Body as ReadableStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline", 
        "Cache-Control": "public, max-age=31536000, immutable", // パフォーマンスのためのキャッシュ設定
      },
    });

  } catch (error) {
    console.error("画像表示エラー:", error);
    return NextResponse.json({ message: "画像が見つかりません" }, { status: 404 });
  }
}