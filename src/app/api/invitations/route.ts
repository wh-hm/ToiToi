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

    // ② email または google_id / session.id を使って DB から正式なユーザーレコードを取得
    let inviterUser = null;

    const userEmail = session?.user?.email;
    const sessionId = (session?.user as any)?.id;

    // email が存在する場合は email で検索
    if (userEmail) {
      inviterUser = await prisma.user.findFirst({
        where: { email: userEmail },
      });
    }

    // 見つからない場合は ID/Google ID で検索
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

    // クライアントから渡された inviter_id がある場合フォールバック検索
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

    // 正式なユーザーが存在しない場合はエラー
    if (!inviterUser) {
      return NextResponse.json(
        { error: '招待元のユーザーが見つかりませんでした。ログインし直してください。' },
        { status: 400 }
      );
    }

    const realInviterId = inviterUser.id; // DBの真の主キー(UUID)

    // バリデーション
    if (!space_id || !realInviterId || !invitee_id) {
      return NextResponse.json(
        { error: '必須項目が不足しています。' },
        { status: 400 }
      );
    }

    // ③ 招待先 (invitee) が DB に存在するか確認
    const inviteeUser = await prisma.user.findUnique({
      where: { id: String(invitee_id) },
    });

    if (!inviteeUser) {
      return NextResponse.json(
        { error: `指定された招待先ユーザー(ID: ${invitee_id})が見つかりません。` },
        { status: 404 }
      );
    }

    // ④ すでに同じスペースに招待中かチェック
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        space_id: Number(space_id),
        invitee_id: String(invitee_id),
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
          inviter_id: String(realInviterId), // DBの真のUUIDを使用
          invitee_id: String(invitee_id),
          status: 0,
        },
      });

      await tx.notification.create({
        data: {
          user_id: String(invitee_id),
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