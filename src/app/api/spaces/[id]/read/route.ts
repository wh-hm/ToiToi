import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const questionId = parseInt(id, 10);
    const body = await req.json();
    const { userId, lastReadQuestionChatId } = body;

    if (!questionId || !userId || typeof lastReadQuestionChatId !== 'number') {
      return NextResponse.json(
        { error: '無効なリクエストパラメータです。' },
        { status: 400 }
      );
    }

    // upsertによるP2002エラー（重複キー制約違反）の回避
    const readStatus = await prisma.questionReadStatus.upsert({
      where: {
        question_id_user_id: {
          question_id: questionId,
          user_id: userId,
        },
      },
      update: {
        last_read_question_chat_id: lastReadQuestionChatId,
      },
      create: {
        question_id: questionId,
        user_id: userId,
        last_read_question_chat_id: lastReadQuestionChatId,
      },
    });

    return NextResponse.json({ success: true, data: readStatus });
  } catch (error) {
    console.error('既読ステータス更新エラー:', error);
    return NextResponse.json(
      { error: '既読ステータスの更新に失敗しました。' },
      { status: 500 }
    );
  }
}