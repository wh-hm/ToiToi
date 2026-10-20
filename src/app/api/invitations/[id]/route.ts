import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    const sessionId = (session?.user as any)?.id;

    if (!userEmail && !sessionId) {
      return NextResponse.json({ error: '認証されていません' }, { status: 401 });
    }

    // ログインユーザーの特定
    let currentUser = null;
    if (userEmail) {
      currentUser = await prisma.user.findFirst({ where: { email: userEmail } });
    }
    if (!currentUser && sessionId) {
      const strSessionId = String(sessionId);
      currentUser = await prisma.user.findFirst({
        where: { OR: [{ id: strSessionId }, { google_id: strSessionId }] },
      });
    }

    if (!currentUser) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    const resolvedParams = await params;
    const invitationId = Number(resolvedParams.id);
    const { action } = await request.json(); // "accept" または "reject"

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: '無効な操作です' }, { status: 400 });
    }

    // 招待の存在確認と本人確認
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      return NextResponse.json({ error: '招待が見つかりません' }, { status: 404 });
    }

    if (invitation.invitee_id !== currentUser.id) {
      return NextResponse.json({ error: 'この招待に応答する権限がありません' }, { status: 403 });
    }

    if (invitation.status !== 0) {
      return NextResponse.json({ error: 'この招待はすでに処理されています' }, { status: 400 });
    }

    // トランザクション処理
    const result = await prisma.$transaction(async (tx) => {
      if (action === 'accept') {
        // ① 招待ステータスを「承認 (1)」に更新
        const updatedInvitation = await tx.invitation.update({
          where: { id: invitationId },
          data: { status: 1 },
        });

        // ② ユーザーにスペースを紐付けて参加させる
        await tx.user.update({
          where: { id: currentUser.id },
          data: {
            joined_spaces: {
              connect: { id: invitation.space_id },
            },
          },
        });

        return { invitation: updatedInvitation, action: 'accepted' };
      } else {
        // ① 招待ステータスを「拒否 (2)」に更新
        const updatedInvitation = await tx.invitation.update({
          where: { id: invitationId },
          data: { status: 2 },
        });

        return { invitation: updatedInvitation, action: 'rejected' };
      }
    });

    const message = action === 'accept' ? 'スペースに参加しました' : '招待を辞退しました';
    return NextResponse.json({ message, data: result }, { status: 200 });

  } catch (error: any) {
    console.error('招待回答エラー:', error);
    return NextResponse.json(
      { error: error.message || 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}