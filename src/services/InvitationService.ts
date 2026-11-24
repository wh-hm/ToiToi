import { prisma } from "@/lib/prisma";
import { Invitation, Prisma } from "@prisma/client";
import { deleteImages } from "./StorageService";

export type Tx = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * ユーザーの招待情報一覧を取得する（未削除・承認待ち）
 */
export async function getInvitations(inviteePublicUserId: string): Promise<Invitation[]> {
  return await prisma.invitation.findMany({
    where: {
      invitee_id: inviteePublicUserId,
      delete_flag: 0,
      status: 0,
    },
    include: {
      space: {
        select: { id: true, name: true, space_type: true },
      },
      inviter: {
        select: { id: true, user_id: true, username: true, email: true },
      },
    },
    orderBy: { created_at: "desc" },
  });
}

/**
 * 指定された招待情報を取得する
 */
export async function getInvitation(invitationId: number | string): Promise<Invitation | null> {
  const id = Number(invitationId);
  if (isNaN(id)) return null;

  return await prisma.invitation.findFirst({
    where: {
      id,
      delete_flag: 0,
    },
  });
}

/**
 * 招待情報の承認ステータスを更新する
 */
export async function updateInvitationStatus(
  invitationId: number,
  inviteePublicUserId: string,
  status: number,
  tx?: Tx
): Promise<boolean> {
  const db = tx || prisma;

  const target = await db.invitation.findFirst({
    where: {
      id: invitationId,
      invitee_id: inviteePublicUserId,
      status: 0,
      delete_flag: 0,
    },
  });

  if (!target) {
    return false;
  }

  await db.invitation.update({
    where: { id: invitationId },
    data: { status },
  });

  return true;
}

/**
 * 招待を承認し、対象ユーザーをスペースのグループ（groups）に追加する
 */
export async function acceptInvitation(
  invitationId: number,
  inviteePublicUserId: string,
  tx?: Tx
): Promise<boolean> {
  const execute = async (db: Tx) => {
    // ① 招待情報の検索
    const invitation = await db.invitation.findFirst({
      where: {
        id: invitationId,
        invitee_id: inviteePublicUserId,
        status: 0,
        delete_flag: 0,
      },
    });

    if (!invitation) {
      return false;
    }

    const spaceId = invitation.space_id;

    // ② グループへの追加（既に有効な所属情報が存在する場合は重複登録しない）
    const existingGroup = await db.group.findFirst({
      where: {
        space_id: spaceId,
        user_id: inviteePublicUserId,
        delete_flag: 0,
      },
    });

    if (!existingGroup) {
      await db.group.create({
        data: {
          space_id: spaceId,
          user_id: inviteePublicUserId,
          delete_flag: 0,
        },
      });
    }

    // ③ 招待ステータスを承認済み(1)に更新
    await db.invitation.update({
      where: { id: invitationId },
      data: { status: 1 },
    });

    return true;
  };

  if (tx) {
    return await execute(tx);
  }
  return await prisma.$transaction(async (newTx) => await execute(newTx));
}

/**
 * 招待を拒否状態（status = 2）に更新する
 */
export async function rejectInvitation(
  invitationId: number,
  inviteePublicUserId: string,
  tx?: Tx
): Promise<boolean> {
  const execute = async (db: Tx) => {
    const invitation = await db.invitation.findFirst({
      where: {
        id: invitationId,
        invitee_id: inviteePublicUserId,
        status: 0,
        delete_flag: 0,
      },
    });

    if (!invitation) {
      return false;
    }

    await db.invitation.update({
      where: { id: invitationId },
      data: { status: 2 },
    });

    return true;
  };

  if (tx) {
    return await execute(tx);
  }
  return await prisma.$transaction(async (newTx) => await execute(newTx));
}

/**
 * 他の有効なデータから参照されていない画像IDのみを抽出するヘルパー関数
 */
async function filterUnreferencedImageIds(db: Tx, candidateImageIds: number[]): Promise<number[]> {
  if (candidateImageIds.length === 0) return [];
  const uniqueIds = Array.from(new Set(candidateImageIds));
  const deletableIds: number[] = [];

  for (const imageId of uniqueIds) {
    const [activeChatCount, activeQuestionChatCount] = await Promise.all([
      db.chat.count({
        where: { image_id: imageId, delete_flag: 0 },
      }),
      db.questionChats.count({
        where: { image_id: imageId, delete_flag: 0 },
      }),
    ]);

    if (activeChatCount === 0 && activeQuestionChatCount === 0) {
      deletableIds.push(imageId);
    }
  }

  return deletableIds;
}

/**
 * 指定したスペースの招待レコードを論理削除し、承認済みユーザーの場合は関連データも論理削除・R2画像削除する
 */
export async function deleteInvitations(
  spaceId: number,
  inviteeIds: string[],
  spaceType: number,
  tx?: Tx
): Promise<boolean> {
  const execute = async (db: Tx) => {
    // 1. invitations から対象レコードを取得
    const invitations = await db.invitation.findMany({
      where: {
        space_id: spaceId,
        invitee_id: { in: inviteeIds },
        delete_flag: 0,
      },
    });

    if (invitations.length === 0) {
      return false;
    }

    // 2. status に応じて分岐処理
    for (const inv of invitations) {
      const inviteeId = inv.invitee_id;

      // 招待レコードを論理削除
      await db.invitation.update({
        where: { id: inv.id },
        data: { delete_flag: 1 },
      });

      // 承認済み（status === 1）の場合は所属情報・関連データ・画像をクリーンアップ
      if (inv.status === 1) {
        if (spaceType === 1) {
          // --- チャットスペース (spaceType === 1) ---
          const targetChats = await db.chat.findMany({
            where: { space_id: spaceId, user_id: inviteeId, delete_flag: 0 },
            select: { id: true, image_id: true },
          });
          const candidateImageIds = targetChats
            .map((c) => c.image_id)
            .filter((id): id is number => id !== null);

          // 先にチャット本体を論理削除
          await db.chat.updateMany({
            where: { space_id: spaceId, user_id: inviteeId, delete_flag: 0 },
            data: { delete_flag: 1 },
          });

          // 他から参照されていない画像をR2物理削除＆DB論理削除
          const deletableImageIds = await filterUnreferencedImageIds(db, candidateImageIds);
          if (deletableImageIds.length > 0) {
            await deleteImages(deletableImageIds);
          }

          // 関連テーブルを論理削除
          await db.favorite.updateMany({
            where: { space_id: spaceId, user_id: inviteeId, delete_flag: 0 },
            data: { delete_flag: 1 },
          });
          await db.chatReadStatus.updateMany({
            where: { space_id: spaceId, user_id: inviteeId, delete_flag: 0 },
            data: { delete_flag: 1 },
          });
          await db.group.updateMany({
            where: { space_id: spaceId, user_id: inviteeId, delete_flag: 0 },
            data: { delete_flag: 1 },
          });
          await db.notification.updateMany({
            where: {
              space_id: spaceId,
              OR: [{ user_id: inviteeId }, { sender_id: inviteeId }],
              delete_flag: 0,
            },
            data: { delete_flag: 1 },
          });
        } else if (spaceType === 3) {
          // --- 質問スペース (spaceType === 3) ---
          // 対象ユーザーが作成した質問ID一覧
          const userQuestions = await db.question.findMany({
            where: { space_id: spaceId, user_id: inviteeId, delete_flag: 0 },
            select: { id: true },
          });
          const userQuestionIds = userQuestions.map((q) => q.id);

          // スペース内の全質問ID一覧
          const spaceQuestions = await db.question.findMany({
            where: { space_id: spaceId, delete_flag: 0 },
            select: { id: true },
          });
          const spaceQuestionIds = spaceQuestions.map((q) => q.id);

          // 削除対象となる返信（対象ユーザー作成の質問に紐づく返信 OR 対象ユーザーが送信した返信）の画像ID取得
          const targetQuestionChats = await db.questionChats.findMany({
            where: {
              delete_flag: 0,
              OR: [
                ...(userQuestionIds.length > 0 ? [{ question_id: { in: userQuestionIds } }] : []),
                ...(spaceQuestionIds.length > 0
                  ? [{ question_id: { in: spaceQuestionIds }, user_id: inviteeId }]
                  : []),
              ],
            },
            select: { id: true, image_id: true },
          });

          const candidateImageIds = targetQuestionChats
            .map((qc) => qc.image_id)
            .filter((id): id is number => id !== null);

          // 質問と返信を論理削除
          if (userQuestionIds.length > 0) {
            await db.question.updateMany({
              where: { id: { in: userQuestionIds }, delete_flag: 0 },
              data: { delete_flag: 1 },
            });
            await db.questionChats.updateMany({
              where: { question_id: { in: userQuestionIds }, delete_flag: 0 },
              data: { delete_flag: 1 },
            });
          }

          if (spaceQuestionIds.length > 0) {
            await db.questionChats.updateMany({
              where: {
                question_id: { in: spaceQuestionIds },
                user_id: inviteeId,
                delete_flag: 0,
              },
              data: { delete_flag: 1 },
            });
          }

          // 他から参照されていない画像をR2物理削除＆DB論理削除
          const deletableImageIds = await filterUnreferencedImageIds(db, candidateImageIds);
          if (deletableImageIds.length > 0) {
            await deleteImages(deletableImageIds);
          }

          // 関連テーブルを論理削除
          await db.nice.updateMany({
            where: { space_id: spaceId, user_id: inviteeId, delete_flag: 0 },
            data: { delete_flag: 1 },
          });
          await db.questionReadStatus.updateMany({
            where: { space_id: spaceId, user_id: inviteeId, delete_flag: 0 },
            data: { delete_flag: 1 },
          });
          await db.group.updateMany({
            where: { space_id: spaceId, user_id: inviteeId, delete_flag: 0 },
            data: { delete_flag: 1 },
          });
          await db.notification.updateMany({
            where: {
              space_id: spaceId,
              OR: [{ user_id: inviteeId }, { sender_id: inviteeId }],
              delete_flag: 0,
            },
            data: { delete_flag: 1 },
          });
        } else {
          // その他のスペースタイプの場合はグループと通知のみ論理削除
          await db.group.updateMany({
            where: { space_id: spaceId, user_id: inviteeId, delete_flag: 0 },
            data: { delete_flag: 1 },
          });
          await db.notification.updateMany({
            where: {
              space_id: spaceId,
              OR: [{ user_id: inviteeId }, { sender_id: inviteeId }],
              delete_flag: 0,
            },
            data: { delete_flag: 1 },
          });
        }
      }
    }

    return true;
  };

  if (tx) {
    return await execute(tx);
  }
  return await prisma.$transaction(async (newTx) => await execute(newTx));
}

/**
 * 複数ユーザーへの招待を作成し、通知を送信する
 */
export async function createInvitations(
  spaceId: number,
  inviterUserId: string,
  rawInviteeIds: string[]
): Promise<Invitation[]> {
  return await prisma.$transaction(async (tx) => {
    const space = await tx.space.findFirst({
      where: { id: spaceId, delete_flag: 0 },
      select: { id: true, name: true, space_type: true },
    });

    if (!space) {
      throw new Error("指定されたスペースが見つかりません。");
    }

    const createdInvitations: Invitation[] = [];

    for (const rawId of rawInviteeIds) {
      const trimmedId = rawId.trim();
      if (!trimmedId) continue;

      // 招待先ユーザー検索（公開ID user_id または 主キー id）
      const inviteeUser = await tx.user.findFirst({
        where: {
          delete_flag: 0,
          OR: [{ user_id: trimmedId }, { id: trimmedId }],
        },
      });

      if (!inviteeUser) {
        throw new Error(`指定された招待ID（${trimmedId}）のユーザーが見つかりません。`);
      }

      if (inviteeUser.id === inviterUserId) {
        throw new Error("自分自身を招待することはできません。");
      }

      // すでに招待中（status: 0）または既に参加済み（groupsに存在）のチェック
      const [existingInv, existingGroup] = await Promise.all([
        tx.invitation.findFirst({
          where: {
            space_id: spaceId,
            invitee_id: inviteeUser.id,
            status: 0,
            delete_flag: 0,
          },
        }),
        tx.group.findFirst({
          where: {
            space_id: spaceId,
            user_id: inviteeUser.id,
            delete_flag: 0,
          },
        }),
      ]);

      if (existingInv) {
        throw new Error(`ユーザー（${trimmedId}）はすでに招待されています。`);
      }
      if (existingGroup) {
        throw new Error(`ユーザー（${trimmedId}）はすでにこのスペースに参加しています。`);
      }

      // 招待レコード作成
      const invitation = await tx.invitation.create({
        data: {
          space_id: spaceId,
          inviter_id: inviterUserId,
          invitee_id: inviteeUser.id,
          status: 0,
          delete_flag: 0,
        },
      });

      // 通知レコード作成（sender_id も設定）
      await tx.notification.create({
        data: {
          user_id: inviteeUser.id,
          sender_id: inviterUserId,
          type: 1,
          related_id: invitation.id,
          space_id: spaceId,
          space_type: space.space_type,
          content: `「${space.name}」への招待が届きました`,
          is_read: 0,
          delete_flag: 0,
        },
      });

      createdInvitations.push(invitation);
    }

    return createdInvitations;
  });
}