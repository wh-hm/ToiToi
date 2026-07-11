// app/api/questions/[id]/messages/route.ts
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { getQuestionChats, registerQuestionChat } from "@/services/QuestionChatService";
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
  
  console.log(spaceId,questionId)


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
      getSpaceCheck(auth.user_id, spaceIdNum), // ※関数名が推測ですが合わせる
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
      getQuestionChats(questionId, auth.user_id),
      getQuestion(questionId, auth.user_id)
    ]);

    

   return NextResponse.json({ 
        chats: messages || [], 
        question: question || null,
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
    const message = formData.get("message") as string;
    const files = formData.getAll("images") as File[]; // 複数画像取得
    const stamp = formData.get("stamp") as string | null;
    const questionId = Number(formData.get("questionId"));

    if (isNaN(spaceIdNum) || spaceIdNum <= 0) {
      return NextResponse.json({ message: MESSAGES.E1001("Space ID") }, { status: 400 });
    }
    if (isNaN(questionId) || questionId <= 0) {
      return NextResponse.json({ message: MESSAGES.E1001("Question ID") }, { status: 400 });
    }

    // 1. バリデーション
    if (!message && files.length === 0 && !stamp) {
      return NextResponse.json({ message: MESSAGES.E1001("チャット内容") }, { status: 400 });
    }

    if (message && message.length > 100) {
      return NextResponse.json({ message: MESSAGES.E1002("チャット内容", 100) }, { status: 400 });
    }

    const [isSpaceAlive,  isQuestionAlive] = await Promise.all([
      getSpaceCheck(auth.user_id, spaceIdNum), // ※関数名が推測ですが合わせる
      checkQuestion(auth.user_id, spaceIdNum, questionId),
    ]);
        
    // スペースチェックの判定
    if (!isSpaceAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    }
    if (!isQuestionAlive) {
        return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });
    }


    // 画像アップロード処理
    let imageUrls: string[] = [];
    if (files.length > 0) {
    for (const [index, file] of files.entries()) {
      if(file.size === 0) return NextResponse.json({ message: MESSAGES.E1012(index + 1)},{ status: 400 });
      if (
        file.size > 2 * 1024 * 1024 ||
        !["image/png", "image/jpeg", "image/jpg"].includes(file.type)
      ) {
        return NextResponse.json(
          {
            message: MESSAGES.E1005(index + 1),
          },
          { status: 400 }
        );
      }
    }

    imageUrls = await uploadImages(files, auth.user_id, spaceId);
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

    return NextResponse.json({ 
        chats: newChats, 
        message: MESSAGES.S1001("メッセージ") 
    }, { status: 201 });

  } catch (error) {
    console.error("❌ POSTメッセージ登録エラーの本当の理由:", error);
    // エラー時の画像削除
    return NextResponse.json({ message: MESSAGES.E2001("質問") }, { status: 500 });
  }
}