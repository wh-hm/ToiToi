import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  acceptInvitation,
  rejectInvitation,
  getInvitation,
  deleteInvitations,
} from "@/services/InvitationService";

async function resolveCurrentUser(session: any) {
  const userEmail = session?.user?.email;
  const sessionId = session?.user?.id;

  if (userEmail) {
    const user = await prisma.user.findFirst({ where: { email: userEmail, delete_flag: 0 } });
    if (user) return user;
  }
  if (sessionId) {
    const strId = String(sessionId);
    const user = await prisma.user.findFirst({
      where: { delete_flag: 0, OR: [{ id: strId }, { google_id: strId }] },
    });
    if (user) return user;
  }
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const currentUser = await resolveCurrentUser(session);

    if (!currentUser) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    const resolvedParams = await params;
    const invitationId = Number(resolvedParams.id);
    const body = await request.json();

    // 仕様書形式 { status: 1 | 2 } と 旧形式 { action: "accept" | "reject" } の両方をサポート
    let targetStatus: number | null = null;
    if (body.status === 1 || body.action === "accept") {
      targetStatus = 1;
    } else if (body.status === 2 || body.action === "reject") {
      targetStatus = 2;
    }

    if (targetStatus === null) {
      return NextResponse.json({ error: "無効なステータスです（1: 承認, 2: 拒否）" }, { status: 400 });
    }

    const invitation = await getInvitation(invitationId);
    if (!invitation) {
      return NextResponse.json({ error: "招待が見つかりません" }, { status: 404 });
    }

    if (invitation.invitee_id !== currentUser.id) {
      return NextResponse.json({ error: "この招待に応答する権限がありません" }, { status: 403 });
    }

    if (invitation.status !== 0) {
      return NextResponse.json({ error: "この招待はすでに処理されています" }, { status: 400 });
    }

    let ok = false;
    if (targetStatus === 1) {
      ok = await acceptInvitation(invitationId, currentUser.id);
    } else {
      ok = await rejectInvitation(invitationId, currentUser.id);
    }

    if (!ok) {
      return NextResponse.json({ error: "招待の更新に失敗しました" }, { status: 400 });
    }

    const message = targetStatus === 1 ? "スペースに参加しました" : "招待を辞退しました";
    return NextResponse.json({ success: true, message }, { status: 200 });
  } catch (error: any) {
    console.error("招待回答エラー:", error);
    return NextResponse.json({ error: error.message || "サーバーエラーが発生しました" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const currentUser = await resolveCurrentUser(session);

    if (!currentUser) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    const resolvedParams = await params;
    const invitationId = Number(resolvedParams.id);

    const invitation = await getInvitation(invitationId);
    if (!invitation) {
      return NextResponse.json({ error: "招待が見つかりません" }, { status: 404 });
    }

    const space = await prisma.space.findUnique({
      where: { id: invitation.space_id },
      select: { id: true, user_id: true, space_type: true },
    });

    if (!space) {
      return NextResponse.json({ error: "対象スペースが見つかりません" }, { status: 404 });
    }

    // スペースオーナー、招待送信者、または招待された本人（退会時）のみ削除可能
    const isAuthorized =
      space.user_id === currentUser.id ||
      invitation.inviter_id === currentUser.id ||
      invitation.invitee_id === currentUser.id;

    if (!isAuthorized) {
      return NextResponse.json({ error: "この招待を削除する権限がありません" }, { status: 403 });
    }

    const deleted = await deleteInvitations(
      invitation.space_id,
      [invitation.invitee_id],
      space.space_type
    );

    if (!deleted) {
      return NextResponse.json({ error: "招待の削除に失敗しました" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "招待を削除しました" }, { status: 200 });
  } catch (error: any) {
    console.error("招待削除エラー:", error);
    return NextResponse.json({ error: error.message || "サーバーエラーが発生しました" }, { status: 500 });
  }
}