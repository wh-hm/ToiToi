// app/api/questions/[id]/messages/[msgId]/status/route.ts
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { toggleLike } from "@/services/QuestionChatService";
import { MESSAGES } from "@/constants/messages";
import { NextRequest } from "next/server";
import { getSpaceCheck } from "@/services/SpaceService";
import { checkQuestionChat } from "@/services/QuestionChatService";
import { checkQuestion } from "@/services/QuestionService";
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  const { msgId, id,  } = await params;
  
  // 1. 認証チェック
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const space_id = parseInt(id);
    const question_id = parseInt(msgId);

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
    // 2. いいね状態の更新
    // status は boolean (true:いいね, false:解除) や 1/0 などで受け取る想定
    const updatedStatus = await toggleLike(chat_id, question_id, auth.user_id);

    if (!updatedStatus) {
      return NextResponse.json({ message: MESSAGES.E1010("更新対象") }, { status: 404 });
    }

    return NextResponse.json({ success: true, status: updatedStatus });
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2001("いいね更新") }, { status: 500 });
  }
}