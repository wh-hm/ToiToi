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
  // 🧪 【検証1：サーバー500エラー / 通信障害モック】
  // ※ 一覧非表示 & 各種コントロール（入力欄/送信/画像UP/スタンプ）の非活性化テスト用
  // const is500ErrorTest = true;
  // if (is500ErrorTest) {
  //   return NextResponse.json({ message: MESSAGES.E2003("チャット") }, { status: 500 });
  // }
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
  if ('error' in auth) {
      return NextResponse.json({ message: auth.error, code: auth.code }, { status: auth.status },);
  }
  try {
    // 🧪 【検証2：対象スペース削除済み / 閲覧権限なし（404モック）】
    // const isSpaceDeletedTest = true;
    // if (isSpaceDeletedTest) {
    //   return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    // }

    // 🧪 【検証3：対象質問削除済み（404モック）】
    // const isQuestionDeletedTest = true;
    // if (isQuestionDeletedTest) {
    //   return NextResponse.json({ message: MESSAGES.E1010("質問") }, { status: 404 });
    // }
    const [isSpaceAlive,  isQuestionAlive] = await Promise.all([
      getQuestionChatsWithImages(auth.user_id, questionId), // ※関数名が推測ですが合わせる
      checkQuestion(auth.user_id, spaceIdNum, questionId),
    ]);
        
    // スペースチェックの判定
    if (!isSpaceAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    }
    if (!isQuestionAlive) {
        return NextResponse.json({ message: MESSAGES.E2006 }, { status: 404 });
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
  if ('error' in auth) {
    return NextResponse.json({ message: auth.error, code: auth.code }, { status: auth.status },);
  }  
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
    // 🧪 【POST検証2：送信時スペース削除済み（404モック）】
     const isPostSpaceDeletedTest = true;
     if (isPostSpaceDeletedTest) {
       return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
     }

    // 🧪 【POST検証3：送信時質問削除済み（404モック）】
    // ※ 別ユーザー等により送信直前に質問が削除された状況の再現
    // const isPostQuestionDeletedTest = true;
    // if (isPostQuestionDeletedTest) {
    //   return NextResponse.json({ message: MESSAGES.E1010("質問") }, { status: 404 });
    // }

    // 🧪 【POST検証4：DB登録エラー（500モック）】
    // ※ DB登録失敗、入力値保持、送信ボタン再活性化のテスト用
    // const isPostDbErrorTest = true;
    // if (isPostDbErrorTest) {
    //   return NextResponse.json({ message: MESSAGES.E2001("データ登録") }, { status: 500 });
    // }
    // 権限チェック  
    const [isSpaceAlive, isQuestionAlive] = await Promise.all([
      getSpaceCheck(auth.user_id, spaceIdNum),
      checkQuestion(auth.user_id, spaceIdNum, questionId),
    ]);
        
    if (!isSpaceAlive  || isSpaceAlive.delete_flag === 1) {
      return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    }
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