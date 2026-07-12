// app/api/questions/[id]/messages/[questionId]/status/route.ts
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
  { params }: { params: Promise<{ spaceId: string; questionId: string }> }
) {
  const { questionId, spaceId,  } = await params;
  
  // 1. 認証チェック
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const spaceIdNum = parseInt(spaceId);
    const questionIdNum = parseInt(questionId);

    const { searchParams } = new URL(request.url);
    const chatId = Number(searchParams.get("chatId"));

    const [isSpaceAlive, isQuestionAlive, isChatAlive] = await Promise.all([
      getSpaceCheck(auth.user_id, spaceIdNum), // ※関数名が推測ですが合わせる
      checkQuestion(auth.user_id, spaceIdNum, questionIdNum),
      checkQuestionChat(chatId, questionIdNum, auth.user_id, )
    ]);
        
    // スペースチェックの判定
    if (!isSpaceAlive) {
        return NextResponse.json({ message: MESSAGES.E1010("スペース") }, { status: 404 });
    }
    if (!isChatAlive) {
        return NextResponse.json({ message: MESSAGES.E2006 }, { status: 409 });
    }

    if (!isQuestionAlive) {
        return NextResponse.json({ message: MESSAGES.E2006 }, { status: 404 });
    }
    // 2. いいね状態の更新
    // status は boolean (true:いいね, false:解除) や 1/0 などで受け取る想定
    const updatedStatus = await toggleLike(chatId, questionIdNum, auth.user_id);

    if (!updatedStatus) {
      return NextResponse.json({ message: MESSAGES.E1010("更新対象") }, { status: 404 });
    }

    return NextResponse.json({ 
        likeStatus: updatedStatus, 
        message: MESSAGES.S1002("いいね状態") 
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2001("いいね更新") }, { status: 500 });
  }
}