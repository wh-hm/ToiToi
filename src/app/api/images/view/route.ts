// app/api/images/view/route.ts
import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getAuthContext } from "@/lib/auth-guard";
import { getSpaceCheck } from "@/services/SpaceService";
import { MESSAGES } from "@/constants/messages";


//将来、チャットのやり取り実現のために画像の持ち主かどうかの検証は行わない。スペースに所属しているかのみの検証を行う。
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

    // 🔒 2. スペース所属チェック
    const hasPermission = await getSpaceCheck(auth.user_id, spaceId);
    if (!hasPermission) {
      return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 403 });
    }

    // 3. Blob URLチェック
    if (targetUrl.startsWith("blob:")) {
      return NextResponse.json({ message: MESSAGES.E1009 }, { status: 400 });
    }

    // 4. R2用の Key を特定（ここでkeyを確定させる）
    let key = targetUrl;
    if (targetUrl.startsWith("http")) {
      const url = new URL(targetUrl);
      const decodedPath = decodeURIComponent(url.pathname);
      key = decodedPath.startsWith('/') ? decodedPath.substring(1) : decodedPath;
      if (key.includes("cloudflarestorage.com/")) {
        key = key.split("cloudflarestorage.com/").pop() || key;
      }
      key = key.split("?")[0];
    }

    // 🔒 5. 【追加】画像と所有者の紐付けチェック
    // key確定後に実行するように修正
    const fileName = key.split("/").pop() || "";
    const extractedUserId = fileName.split('_')[0];

    if (extractedUserId !== auth.user_id) {
      // 適切なエラーメッセージに変更
      return NextResponse.json({ message: "この画像を閲覧する権限がありません" }, { status: 403 });
    }

    // 6. R2から画像取得
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    const response = await s3Client.send(command);

    // 7. Content-Type判定
    const ext = key.split(".").pop()?.toLowerCase();
    let contentType = "image/png";
    if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
    if (ext === "gif") contentType = "image/gif";
    if (ext === "webp") contentType = "image/webp";

    return new Response(response.Body as ReadableStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline", 
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });

  } catch (error) {
    console.error("画像表示エラー:", error);
    // 定義済みの失敗メッセージに変更
    return NextResponse.json({ message: MESSAGES.E3002 }, { status: 404 });
  }
}