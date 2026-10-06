import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; 
import { getServerSession } from "next-auth";
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // ※authOptionsのパスを合わせてください

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { space_id, inviter_id, invitee_id } = body;

    // ① ログインセッションを取得
    const session = await getServerSession(authOptions);

    // ② email または google_id / session.id を使って DB から正式な招待元ユーザーレコードを取得
    let inviterUser = null;

    const userEmail = session?.user?.email;
    const sessionId = (session?.user as any)?.id;

    if (userEmail) {
      inviterUser = await prisma.user.findFirst({
        where: { email: userEmail },
      });
    }

    if (!inviterUser && sessionId) {
      const strSessionId = String(sessionId);
      inviterUser = await prisma.user.findFirst({
        where: {
          OR: [
            { id: strSessionId },
            { google_id: strSessionId },
          ],
        },
      });
    }

    if (!inviterUser && inviter_id) {
      inviterUser = await prisma.user.findFirst({
        where: {
          OR: [
            { id: String(inviter_id) },
            { google_id: String(inviter_id) },
          ],
        },
      });
    }

    if (!inviterUser) {
      return NextResponse.json(
        { error: '招待元のユーザーが見つかりませんでした。ログインし直してください。' },
        { status: 400 }
      );
    }

    const realInviterId = inviterUser.id; // 招待元の真のUUID

    // バリデーション
    if (!space_id || !realInviterId || !invitee_id) {
      return NextResponse.json(
        { error: '必須項目が不足しています。' },
        { status: 400 }
      );
    }

    // ③ 招待先 (invitee) が DB に存在するか確認（user_id または id で検索）
    const inviteeUser = await prisma.user.findFirst({
      where: {
        OR: [
          { user_id: String(invitee_id) }, // マイページで設定する招待ID
          { id: String(invitee_id) },      // 主キーUUID
        ],
      },
    });

    if (!inviteeUser) {
      return NextResponse.json(
        { error: `指定された招待ID（${invitee_id}）のユーザーが見つかりません。` },
        { status: 404 }
      );
    }

    const realInviteeId = inviteeUser.id; // 招待先の真のUUID

    // 自分自身を招待しようとしている場合はエラー
    if (realInviterId === realInviteeId) {
      return NextResponse.json(
        { error: '自分自身を招待することはできません。' },
        { status: 400 }
      );
    }

    // ④ すでに同じスペースに招待中かチェック
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        space_id: Number(space_id),
        invitee_id: String(realInviteeId),
        status: 0,
        delete_flag: 0,
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'このユーザーはすでに招待されています。' },
        { status: 409 }
      );
    }

    // ⑤ トランザクションで「招待」と「通知」を作成
    const result = await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.create({
        data: {
          space_id: Number(space_id),
          inviter_id: String(realInviterId),
          invitee_id: String(realInviteeId),
          status: 0,
        },
      });

      await tx.notification.create({
        data: {
          user_id: String(realInviteeId),
          type: 1,
          related_id: invitation.id,
          space_id: Number(space_id),
          space_type: 0,
          content: '新しいスペースへの招待が届きました',
        },
      });

      return invitation;
    });

    return NextResponse.json(
      { message: '招待を送信しました', data: result },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('招待送信エラー詳細:', error);
    return NextResponse.json(
      { error: error.message || 'サーバーエラーが発生しました。' },
      { status: 500 }
    );
  }
}