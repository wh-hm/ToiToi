import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; 
import { getServerSession } from "next-auth";
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; 
import { createInvitations, getInvitations } from "@/services/InvitationService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = await getServerSession(authOptions);
    const inviterUser = await resolveCurrentUser(session, body.inviter_id);

    if (!inviterUser) {
      return NextResponse.json(
        { error: "招待元のユーザーが見つかりませんでした。ログインし直してください。" },
        { status: 401 }
      );
    }

    // 仕様書形式 { spaceId, inviterIds } と 旧形式 { space_id, invitee_id } の両方をサポート
    const targetSpaceId = Number(body.spaceId ?? body.space_id);
    let inviteeIdList: string[] = [];

    if (Array.isArray(body.inviterIds)) {
      inviteeIdList = body.inviterIds.map(String);
    } else if (Array.isArray(body.inviteeIds)) {
      inviteeIdList = body.inviteeIds.map(String);
    } else if (body.invitee_id) {
      inviteeIdList = [String(body.invitee_id)];
    }

    if (!targetSpaceId || inviteeIdList.length === 0) {
      return NextResponse.json({ error: "必須項目（spaceId, inviterIds）が不足しています。" }, { status: 400 });
    }

    const invitations = await createInvitations(targetSpaceId, inviterUser.id, inviteeIdList);

    return NextResponse.json(
      {
        invitations,
        message: "招待を送信しました",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("招待送信エラー詳細:", error);
    const status = error.message?.includes("見つかりません")
      ? 404
      : error.message?.includes("すでに")
      ? 409
      : error.message?.includes("自分自身")
      ? 400
      : 500;
    return NextResponse.json({ error: error.message || "サーバーエラーが発生しました。" }, { status });
  }
}

async function resolveCurrentUser(session: any, fallbackInviterId?: string) {
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
  if (fallbackInviterId) {
    const strId = String(fallbackInviterId);
    const user = await prisma.user.findFirst({
      where: { delete_flag: 0, OR: [{ id: strId }, { google_id: strId }] },
    });
    if (user) return user;
  }
  return null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const currentUser = await resolveCurrentUser(session);
    if (!currentUser) {
      return NextResponse.json({ error: "認証されていません" }, { status: 401 });
    }

    const invitations = await getInvitations(currentUser.id);
    return NextResponse.json({ invitations }, { status: 200 });
  } catch (error: any) {
    console.error("招待一覧取得エラー:", error);
    return NextResponse.json({ error: error.message || "サーバーエラーが発生しました。" }, { status: 500 });
  }
}
