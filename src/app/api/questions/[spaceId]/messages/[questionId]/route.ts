// app/api/questions/[id]/messages/[questionId]/route.ts
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { updateQuestionChat, deleteQuestionChat, checkQuestionChat } from "@/services/QuestionChatService";
import { MESSAGES } from "@/constants/messages";
import { NextRequest } from "next/server";
import { getSpaceCheck } from "@/services/SpaceService";
import { checkQuestion } from "@/services/QuestionService";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const { id, questionId } = await params;
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const spaceId = Number(id);
    const questionIdNum = Number(questionId);
    // 1. 認証チェックを先に済ませる

    const { searchParams } = new URL(request.url);
    const chatId = Number(searchParams.get("chatId"));

    const [isSpaceAlive, usQuestionAlive, isChatAlive] = await Promise.all([
      getSpaceCheck(auth.user_id, spaceId), // ※関数名が推測ですが合わせる
      checkQuestion(auth.user_id, spaceId, questionIdNum),
      checkQuestionChat(chatId, questionIdNum, auth.user_id, )
    ]);
        
    // スペースチェックの判定
    if (!isSpaceAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    }
    if (!isChatAlive) {
        return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });
    }

    if (!usQuestionAlive) {
        return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });
    }

    const { message } = await request.json();
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
  request: Request,
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