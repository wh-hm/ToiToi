// app/api/questions/[id]/messages/route.ts
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { getQuestionChats, registerQuestionChat } from "@/services/QuestionChatService";
import { uploadImages, deleteImages } from "@/services/StorageService";
import { MESSAGES } from "@/constants/messages";
import { getQuestion } from "@/services/QuestionService";
import Question from "@/app/question/[spaceId]/page";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// 1. メッセージ一覧取得 (GET)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id : string }> } // パラメータ名は "id" だけでOK
) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  if (!id) {
    return NextResponse.json({ error: "IDが取得できません" }, { status: 400 });
  }

  const auth = await getAuthContext();
  const questionId = parseInt(id);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  // const { id } = await params; // ここで id (spaceIdのこと) を取得
  try {
    
    // ★ 並列処理に修正：Promise.all で同時に取得する
    const [messages, question] = await Promise.all([
      getQuestionChats(questionId, auth.user_id),
      getQuestion(questionId, auth.user_id)
    ]);
    
    // データが null なら空配列 [] を返すようにする
    // オブジェクトとしてまとめて返す
    return NextResponse.json({
      messages: messages || [],
      question: question || null
    });
  } catch (error) {
    console.error("一覧取得エラー:", error);
    return NextResponse.json({ error: "取得失敗" }, { status: 500 });
  }
}


export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  
  const { id } = await params;
  const questionId = parseInt(id);

  try {
    const formData = await request.formData();
    const message = formData.get("message") as string;
    const files = formData.getAll("images") as File[]; // 複数画像取得
    const stamp = formData.get("stamp") as string | null;
    const space_id = Number(formData.get("space_id"));

    // 1. バリデーション
    if (!message && files.length === 0 && !stamp) {
      return NextResponse.json({ error: MESSAGES.E1001("チャット内容") }, { status: 400 });
    }

    if (message && message.length > 100) {
      return NextResponse.json({ error: MESSAGES.E1002("チャット内容", 100) }, { status: 400 });
    }

    // 画像アップロード処理
    let imageUrls: string[] = [];
    if (files.length > 0) {
      for (const file of files) {
        if (file.size > 2 * 1024 * 1024 || !["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
          return NextResponse.json({ error: MESSAGES.E1005 }, { status: 400 });
        }
      }
      imageUrls = await uploadImages(files, auth.user_id, space_id);
    }

    // 2. DB登録処理
    const newChats = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 画像がない場合
      if (imageUrls.length === 0) {
        return [await registerQuestionChat(questionId, auth.user_id, message || undefined, undefined, stamp || undefined, tx)];
      }

      // 画像がある場合はループして個別に登録
      const results = [];
      for (let i = 0; i < imageUrls.length; i++) {
        const res = await registerQuestionChat(
          questionId,
          auth.user_id,
          i === 0 ? (message || undefined) : undefined, // 1枚目にメッセージ/スタンプ付与
          imageUrls[i],
          i === 0 ? (stamp || undefined) : undefined,
          tx
        );
        results.push(res);
      }
      return results;
    });

    return NextResponse.json({ messages: newChats }, { status: 201 });

  } catch (error) {
    // エラー時の画像削除
    console.error("API処理エラー:", error);
    return NextResponse.json({ error: MESSAGES.E2001("質問") }, { status: 500 });
  }
}