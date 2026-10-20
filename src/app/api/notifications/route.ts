import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
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

    // ログインユーザー宛ての通知一覧を取得（新しい順）
    const notifications = await prisma.notification.findMany({
      where: {
        user_id: currentUser.id,
      },
      orderBy: {
        created_at: 'desc',
      },
      include: {
        // 関連するスペース情報を含める
        space: true,
      },
    });

    // 招待通知の場合は招待情報と招待者情報も添えて返す
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        if (notification.type === 1 && notification.related_id) {
          const invitation = await prisma.invitation.findUnique({
            where: { id: notification.related_id },
            include: {
              inviter: {
                select: {
                  id: true,
                  username: true,
                  user_id: true,
                  profile_image_url: true,
                },
              },
            },
          });
          return {
            ...notification,
            invitation,
          };
        }
        return notification;
      })
    );

    return NextResponse.json({ notifications: enrichedNotifications }, { status: 200 });
  } catch (error: any) {
    console.error('通知取得エラー:', error);
    return NextResponse.json({ error: '通知の取得に失敗しました' }, { status: 500 });
  }
}