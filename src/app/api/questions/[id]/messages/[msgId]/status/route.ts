// app/api/questions/[id]/messages/[msgId]/status/route.ts
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { toggleLike } from "@/services/QuestionChatService";
import { MESSAGES } from "@/constants/messages";

export async function PATCH(
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  const { id, msgId } = await params;
  
  // 1. 認証チェック
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {

    // 2. いいね状態の更新
    // status は boolean (true:いいね, false:解除) や 1/0 などで受け取る想定
    const updatedStatus = await toggleLike(parseInt(msgId), parseInt(id), auth.user_id);

    if (!updatedStatus) {
      return NextResponse.json({ message: MESSAGES.E1010("更新対象") }, { status: 404 });
    }

    return NextResponse.json({ success: true, status: updatedStatus });
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2001("いいね更新") }, { status: 500 });
  }
}