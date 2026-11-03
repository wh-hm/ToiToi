import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; questionId: string }> }
) {
  try {
    const { questionId } = await params;
    const parsedQuestionId = parseInt(questionId, 10);
    const body = await req.json();
    const { userId, lastReadQuestionChatId } = body;

    if (!userId || !lastReadQuestionChatId || isNaN(parsedQuestionId)) {
      return NextResponse.json({ error: 'パラメータが不足しています' }, { status: 400 });
    }

    const readStatus = await prisma.questionReadStatus.upsert({
      where: {
        question_id_user_id: {
          question_id: parsedQuestionId,
          user_id: userId,
        },
      },
      update: {
        last_read_question_chat_id: lastReadQuestionChatId,
      },
      create: {
        question_id: parsedQuestionId,
        user_id: userId,
        last_read_question_chat_id: lastReadQuestionChatId,
      },
    });

    return NextResponse.json(readStatus, { status: 200 });
  } catch (error) {
    console.error('質問既読更新エラー:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}