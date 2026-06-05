// app/api/questions/[id]/messages/[msgId]/route.ts
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { updateQuestionChat, deleteQuestionChat } from "@/services/QuestionChatService";
import { MESSAGES } from "@/constants/messages";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  const { id, msgId } = await params;
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { content } = await request.json();
    const updated = await updateQuestionChat(parseInt(id),parseInt(msgId), auth.user_id, content);
    
    if (!updated) return NextResponse.json({ error: MESSAGES.E2001("チャット") }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("更新エラー:", error);
    return NextResponse.json({ error: MESSAGES.E2001("チャット") }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> }
) {
  const { id, msgId } = await params;
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const success = await deleteQuestionChat(parseInt(id), parseInt(msgId), auth.user_id);
    if (!success) return NextResponse.json({ error: MESSAGES.E2004("チャット")  }, { status: 404 });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("削除エラー:", error);
    return NextResponse.json({ error: MESSAGES.E2004("チャット") }, { status: 500 });
  }
}