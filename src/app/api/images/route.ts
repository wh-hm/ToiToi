// app/api/images/route.ts
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { deleteImages } from "@/services/StorageService"; // ストレージサービスと仮定
import { MESSAGES } from "@/constants/messages";
import { getSpaceCheck } from "@/services/SpaceService";
import { checkQuestionChat } from "@/services/QuestionChatService";
import { getChatCheck } from "@/services/ChatService";
// export async function DELETE() {
//   // 1. 認証チェック
//   const auth = await getAuthContext();
//   if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

//   try {
//     await deleteImages(auth.user_id);

//     return NextResponse.json({ message: MESSAGES.S1004("画像")});
//   } catch (error) {
//     return NextResponse.json({ message: MESSAGES.E2004("画像") }, { status: 500 });
//   }
// }


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
  // 💡 【修正点1】リクエストボディの読み込みは「絶対に最初の一回だけ」！
  // question_id は入っていない可能性もあるので、デフォルト値を考慮するか省略可能にします
  const body = await request.json();
  const { targetUrl, space_id, type, chat_id, question_id } = body;

  const auth = await getAuthContext();
  if ('error' in auth) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  // 💡 バリデーション用に数値をパース
  const sId = parseInt(space_id);
  const cId = parseInt(chat_id);
  const qId = question_id ? parseInt(question_id) : null;

  // ==========================================
  // 1. 権限・生存チェック（並列化版）
  // ==========================================

  // チェック用のPromise配列を準備
  const checkTasks = [];

  if (type === "chat") {
    // スペースとチャットのチェックを同時に飛ばす
    checkTasks.push(getSpaceCheck(auth.user_id, sId));
    checkTasks.push(getChatCheck(auth.user_id, sId, cId));
  } else if (type === "question") {
    // question_idのバリデーションは先に行う
    if (!qId) {
      return NextResponse.json({ message: MESSAGES.E1008 }, { status: 400 });
    }
    // スペースと質問チャットのチェックを同時に飛ばす
    checkTasks.push(getSpaceCheck(auth.user_id, sId));
    console.log(cId, qId, auth.user_id);
    checkTasks.push(checkQuestionChat(cId, qId, auth.user_id));
  }

  // すべてのチェックを並列実行
  const [isSpaceAlive, isChatAlive] = await Promise.all(checkTasks);

  // 判定処理
  if (!isSpaceAlive) {
    return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
  }
  if (!isChatAlive) {
    return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });
  }

  // ==========================================
  // 2. R2の Key を特定・お掃除するロジック
  // ==========================================
  let key = targetUrl;

  // 💡 【修正点2】blob: が届いた場合、さっきの「_」区切りを使ってファイル名を救出する！
  if (targetUrl.startsWith('blob:')) {
    // 例: blob:http://localhost:3000/bf34f18c-79f7_26_004.png のような形を想定
    // 一番最後のスラッシュ「/」で区切って、後ろ側のファイル名部分だけを抜き出す
    const fileName = targetUrl.split("/").pop();
    
    if (fileName && fileName.includes("_")) {
      key = fileName; // ➔ "bf34f18c-79f7_26_004.png" が無事救出される！
    } else {
      return NextResponse.json({ message: MESSAGES.E1009 }, { status: 400 });
    }
  }

  // URLの形式（http...）になっている場合はドメインや先頭のスラッシュを削る
  try {
    if (key.startsWith('http')) {
      const url = new URL(key);
      const decodedPath = decodeURIComponent(url.pathname); // デコードして日本語や記号のバグを防ぐ
      
      // 先頭のスラッシュを削る
      key = decodedPath.startsWith('/') ? decodedPath.substring(1) : decodedPath;

      // 💡 もしURLのパスの中に、まだフルURLがネストして残っている場合の最終防衛策
      if (key.includes("cloudflarestorage.com/")) {
        key = key.split("cloudflarestorage.com/").pop() || key;
      }
      // クエリパラメータ（?以降）を確実にカット
      key = key.split("?")[0];
    }
  } catch (e) {
    console.warn("URLとしての解析はスキップされました:", targetUrl);
  }

  // デバッグで確認
  console.log("R2に最終的に送る綺麗になったKey:", key);

  // ==========================================
  // 3. R2からダウンロード実行
  // ==========================================
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    const response = await s3Client.send(command);
    
    // 元のファイル名をクエリなどから復元するか、なければkeyの後ろ側を使用
    const downloadName = key.split("/").pop() || "download.png";
    
    return new Response(response.Body as ReadableStream, {
      headers: {
        "Content-Type": "application/octet-stream", 
        "Content-Disposition": `attachment; filename="${encodeURIComponent(downloadName)}"`, // 💡ファイル名を動的に
      },
    });
  } catch (error) {
    console.error("R2ダウンロードエラー:", error);
    return NextResponse.json({ message: MESSAGES.E3002 }, { status: 404 });
  }
}