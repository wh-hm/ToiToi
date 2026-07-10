// app/api/questions/[id]/messages/[msgId]/route.ts
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { updateQuestionChat, deleteQuestionChat, checkQuestionChat } from "@/services/QuestionChatService";
import { MESSAGES } from "@/constants/messages";
import { NextRequest } from "next/server";
import { getSpaceCheck } from "@/services/SpaceService";
import { checkQuestion } from "@/services/QuestionService";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  const { id, msgId } = await params;
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const space_id = parseInt(id);
    const question_id = parseInt(msgId);
    // 1. 認証チェックを先に済ませる

    const { searchParams } = new URL(request.url);
    const chat_id = Number(searchParams.get("chat_id"));

    const [isSpaceAlive, usQuestionAlive, isChatAlive] = await Promise.all([
      getSpaceCheck(auth.user_id, space_id), // ※関数名が推測ですが合わせる
      checkQuestion(auth.user_id, space_id, question_id),
      checkQuestionChat(chat_id, question_id, auth.user_id, )
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
    const updated = await updateQuestionChat(chat_id,question_id, auth.user_id, message);
    
    if (!updated) return NextResponse.json({ message: MESSAGES.E2001("チャット") }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2001("チャット") }, { status: 500 });
  }
}



export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
 const { id, msgId } = await params;
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  const space_id = parseInt(id);
  const question_id = parseInt(msgId);
  // 1. 認証チェックを先に済ませる

  const { searchParams } = new URL(request.url);
  const chat_id = Number(searchParams.get("chat_id"));


  if (isNaN(space_id) || isNaN(chat_id)) {
    return NextResponse.json({ message: MESSAGES.E1008 }, { status: 400 });
  }

  try {
    
    
    // 3. 削除実行
    const result = await deleteQuestionChat(chat_id, question_id, auth.user_id);
    if(! result){
      return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ message: MESSAGES.E2001("チャット") }, { status: 500 });
  }
}