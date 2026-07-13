// app/api/questions/[id]/messages/[questionId]/route.ts
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { updateQuestionChat, deleteQuestionChat, checkQuestionChat } from "@/services/QuestionChatService";
import { MESSAGES } from "@/constants/messages";
import { NextRequest } from "next/server";
import { getSpaceCheck } from "@/services/SpaceService";
import { checkQuestion } from "@/services/QuestionService";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; questionId: string }> }
) {
  const { spaceId, questionId } = await params;
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const spaceIdNum = Number(spaceId);
    const questionIdNum = Number(questionId);
    // 1. 認証チェックを先に済ませる
    const { searchParams } = new URL(request.url);
    const chatId = Number(searchParams.get("chatId"));
    const { message } = await request.json();

    if (!message || message.trim() === "") {
      return NextResponse.json({ message: MESSAGES.E1001("チャット内容") }, { status: 400 });
    }

    console.log("データよ～",chatId, spaceIdNum, questionIdNum, auth.user_id, message);


    const [isSpaceAlive, usQuestionAlive, isChatAlive] = await Promise.all([
      getSpaceCheck(auth.user_id, spaceIdNum), // ※関数名が推測ですが合わせる
      checkQuestion(auth.user_id, spaceIdNum, questionIdNum),
      checkQuestionChat(chatId, questionIdNum, auth.user_id)
    ]);
    console.log("データよ～",chatId, questionIdNum, auth.user_id, message);
        
    // スペースチェックの判定
    if (!isSpaceAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    }
    console.log("データよ～",chatId, questionIdNum, auth.user_id, message);

    if (!isChatAlive) {
        return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });
    }
    console.log("データよ～",chatId, questionIdNum, auth.user_id, message);

    if (!usQuestionAlive) {
        return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });
    }
    console.log("データよ～",chatId, questionIdNum, auth.user_id, message);

    
    const updatedChat = await updateQuestionChat(chatId, questionIdNum, auth.user_id, message);
    
    if (!updatedChat) return NextResponse.json({ message: MESSAGES.E2001("チャット") }, { status: 404 });
    return NextResponse.json({ 
        updatedChat: updatedChat, 
        message: MESSAGES.S1002("チャット") 
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2001("チャット") }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; questionId: string }> }
) {
 const { spaceId, questionId } = await params;
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  const spaceIdNum = Number(spaceId);
  const questionIdNum = Number(questionId);
  // 1. 認証チェックを先に済ませる
  const { searchParams } = new URL(request.url);
  const chatId = Number(searchParams.get("chatId"));
  console.log(spaceIdNum, questionId, chatId)

  if (isNaN(spaceIdNum) || isNaN(chatId)) {
    return NextResponse.json({ message: MESSAGES.E1008 }, { status: 400 });
  }

  try {
    const [isSpaceAlive, isQuestionAlive, isChatAlive] = await Promise.all([
    getSpaceCheck(auth.user_id, spaceIdNum),
    checkQuestion(auth.user_id, spaceIdNum, questionIdNum),
    checkQuestionChat(chatId, questionIdNum, auth.user_id)
    ]);
    if (!isSpaceAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 }); // 権限なし
    }
    if (!isQuestionAlive) {
        return NextResponse.json({ message: MESSAGES.E2005("質問") }, { status: 404 }); // データなし
    }
    if (!isChatAlive) {
        return NextResponse.json({ message: MESSAGES.E2005("チャット") }, { status: 404 }); // データなし
    }
    // 3. 削除実行
    const result = await deleteQuestionChat(chatId, questionIdNum, auth.user_id);
    if(! result){
      return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });
    }

    return NextResponse.json({ 
        success: true, 
        message: MESSAGES.S1003("チャット") 
    }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ message: MESSAGES.E2001("チャット") }, { status: 500 });
  }
}