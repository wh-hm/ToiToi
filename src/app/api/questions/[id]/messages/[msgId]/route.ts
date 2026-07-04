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
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const { message } = await request.json();
    const updated = await updateQuestionChat(parseInt(msgId),parseInt(id), auth.user_id, message);
    
    if (!updated) return NextResponse.json({ message: MESSAGES.E2001("チャット") }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2001("チャット") }, { status: 500 });
  }
}

export async function DELETE(
  { params }: { params: Promise<{ id: string; msgId: string }> } // [id] と [msgId] の両方が必要
) {
  const { id, msgId } = await params;
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    const success = await deleteQuestionChat(parseInt(msgId), parseInt(id), auth.user_id);
    if (!success) return NextResponse.json({ message: MESSAGES.E2004("チャット")  }, { status: 404 });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: MESSAGES.E2004("チャット") }, { status: 500 });
  }
}