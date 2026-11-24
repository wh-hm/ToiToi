import { prisma } from "@/lib/prisma";

/**
 * ユーザーの通知一覧を取得（論理削除済みを除外・招待情報を付与）
 */
export async function getNotifications(userId: string) {
  const notifications = await prisma.notification.findMany({
    where: {
      user_id: userId,
      delete_flag: 0,
    },
    orderBy: {
      created_at: "desc",
    },
    include: {
      space: {
        select: {
          id: true,
          name: true,
        },
      },
      sender: {
        select: {
          id: true,
          username: true,
          user_id: true,
          profile_image_id: true,
        },
      },
    },
  });

  // 招待通知（type === 1）の場合は招待情報も付与
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
                profile_image_id: true,
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

  // 未読件数（未処理の招待 OR 未読の通常通知）
  const unreadCount = enrichedNotifications.filter((n: any) => {
    if (n.type === 1 && n.invitation) {
      return n.invitation.status === 0;
    }
    return n.is_read === 0;
  }).length;

  return {
    notifications: enrichedNotifications,
    unreadCount,
  };
}

/**
 * 通知を既読にする（notificationId 指定時は1件のみ、未指定時は全件既読）
 */
export async function markNotificationAsRead(userId: string, notificationId?: number) {
  if (notificationId) {
    return await prisma.notification.updateMany({
      where: {
        id: notificationId,
        user_id: userId,
        delete_flag: 0,
      },
      data: {
        is_read: 1,
      },
    });
  }

  return await prisma.notification.updateMany({
    where: {
      user_id: userId,
      is_read: 0,
      delete_flag: 0,
    },
    data: {
      is_read: 1,
    },
  });
}

/**
 * 通知を論理削除（非表示）にする
 */
export async function deleteNotification(userId: string, notificationId: number) {
  return await prisma.notification.updateMany({
    where: {
      id: notificationId,
      user_id: userId,
      delete_flag: 0,
    },
    data: {
      delete_flag: 1,
    },
  });
}