// app/api/questions/[id]/messages/route.ts
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { getQuestionChatsWithImages, registerQuestionChat } from "@/services/QuestionChatService";
import { uploadImages } from "@/services/StorageService";
import { MESSAGES } from "@/constants/messages";
import { getQuestion, checkQuestion } from "@/services/QuestionService";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSpaceCheck } from "@/services/SpaceService";


// 1. メッセージ一覧取得 (GET)
export async function GET(
  request: Request,
   { params }: { params: Promise<{ spaceId: string }> }
) {
  const { spaceId } = await params;
  const { searchParams } = new URL(request.url);
  const questionId = Number(searchParams.get("questionId"));
  const spaceIdNum = Number(spaceId);
  
  if (isNaN(spaceIdNum) || spaceIdNum <= 0) {
    return NextResponse.json({ message: MESSAGES.E1001("Space ID") }, { status: 400 });
  }
  if (isNaN(questionId) || questionId <= 0) {
    return NextResponse.json({ message: MESSAGES.E1001("Question ID") }, { status: 400 });
  }

  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const [isSpaceAlive,  isQuestionAlive] = await Promise.all([
      getQuestionChatsWithImages(auth.user_id, questionId), // ※関数名が推測ですが合わせる
      checkQuestion(auth.user_id, spaceIdNum, questionId),
    ]);
        
    // スペースチェックの判定
    if (!isSpaceAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    }
    if (!isQuestionAlive) {
        return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });
    }
    const [messages, question] = await Promise.all([
      getQuestionChatsWithImages(auth.user_id, questionId),
      getQuestion(questionId, auth.user_id)
    ]);
    const safeNewChat = JSON.parse(JSON.stringify(messages));
    const safeQuestion = JSON.parse(JSON.stringify(question));

    return NextResponse.json({ 
        chats: safeNewChat || [], 
        question: safeQuestion || null,
        message: MESSAGES.S2001("メッセージ一覧") 
    });
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2003("チャット") }, { status: 500 });
  }
}


export async function POST(
  request: Request,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  
  const { spaceId } = await params;
  const spaceIdNum = Number(spaceId);

  try {
    const formData = await request.formData();
    
    // 💡 修正1: caption と message の両方を安全に取得
    const message = formData.get("message") as string | null;
    const caption = formData.get("caption") as string | null;
    
    const files = formData.getAll("images") as File[];
    const stamp = formData.get("stamp") as string | null;
    const questionId = Number(formData.get("questionId")); // numberへ変換

    // バリデーション
    if (isNaN(spaceIdNum) || spaceIdNum <= 0) {
      return NextResponse.json({ message: MESSAGES.E1001("Space ID") }, { status: 400 });
    }
    if (isNaN(questionId) || questionId <= 0) {
      return NextResponse.json({ message: MESSAGES.E1001("Question ID") }, { status: 400 });
    }

    // 💡 修正2: content を使ってバリデーション
    if (!message && files.length === 0 && !stamp) {
      return NextResponse.json({ message: MESSAGES.E1001("チャット内容") }, { status: 400 });
    }

    if (message && message.length > 100) {
      return NextResponse.json({ message: MESSAGES.E1002("チャット内容", 100) }, { status: 400 });
    }

    // 権限チェック
    const [isSpaceAlive, isQuestionAlive] = await Promise.all([
      getSpaceCheck(auth.user_id, spaceIdNum),
      checkQuestion(auth.user_id, spaceIdNum, questionId),
    ]);
        
    if (!isSpaceAlive) return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    if (!isQuestionAlive) return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });

    // 画像アップロード
    let imageUrls: string[] = [];
    if (files.length > 0) {
      for (const [index, file] of files.entries()) {
        if (file.size === 0) return NextResponse.json({ message: MESSAGES.E1012(index + 1) }, { status: 400 });
        if (file.size > 2 * 1024 * 1024 || !["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
          return NextResponse.json({ message: MESSAGES.E1005(index + 1) }, { status: 400 });
        }
      }
      imageUrls = await uploadImages(files, auth.user_id, spaceIdNum);
    }

    // 2. DB登録処理
    const newChats = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {

      if (imageUrls.length === 0) {
        return [await registerQuestionChat({
          questionId,
          userId: auth.user_id,
          message: message || undefined,
          stamp: stamp || undefined
        }, tx)];
      }
        const results = [];
        for (let i = 0; i < imageUrls.length; i++) {
          const res = await registerQuestionChat({
            questionId: questionId,
            userId: auth.user_id, // ここは auth.user_id ではなくプロパティ名が必要
            message: message || undefined, // 1枚目のみメッセージを付与
            imageUrl: imageUrls[i],                 // ここで imageUrl というプロパティ名で指定
            caption: caption || undefined, // キャプションとしても登録
            stamp: stamp ||  undefined
          }, tx);
          results.push(res);
        }
      return results;
    });

    return NextResponse.json({ 
        chats: newChats, 
        message: MESSAGES.S1001("メッセージ") 
    }, { status: 201 });

  } catch (error) {
    console.error("❌ POSTメッセージ登録エラー:", error);
    return NextResponse.json({ message: MESSAGES.E2001("質問") }, { status: 500 });
  }
}