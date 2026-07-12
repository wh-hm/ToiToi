import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { deleteUser } from "@/services/UserService";
import { MESSAGES } from "@/constants/messages";
import { getUser } from "@/services/UserService";
import { getSpaces } from "@/services/SpaceService";
import { getImageCount } from "@/services/StorageService";

export async function GET() {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  try {
    const [user, spaces, imageCount] = await Promise.all([
      getUser(auth.user_id),
      getSpaces(auth.user_id),
      getImageCount(auth.user_id)
    ]);

    const result = {
      chat: spaces.filter(s => s.space_type === 1),
      task: spaces.filter(s => s.space_type === 2),
      question: spaces.filter(s => s.space_type === 3),
    };
    if (!user) {
      return NextResponse.json({ message: MESSAGES.E1010("ユーザー") }, { status: 404 });
    }
    return NextResponse.json({ 
      user: user, 
      spaces: result, 
      imageCount: imageCount,
      message: MESSAGES.S2001("アカウント情報")
    }, { status: 200 });
  } catch (error) {
    console.error("【マイページデータ取得エラー】", error);
    return NextResponse.json(
      { message: MESSAGES.E2003("アカウント情報") },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });
  try {
    const success = await deleteUser(auth.user_id);
    
    if (!success) {
      return NextResponse.json(
        { message: MESSAGES.E1010("ユーザー") },
        { status: 404 }
      );
    }
    return NextResponse.json({ 
        success: true, 
        message: MESSAGES.S1003("ユーザー") 
    }, { status: 200 });

  } catch (error) {
    console.error("【ユーザー削除エラー】", error);
    return NextResponse.json({ message: MESSAGES.E2004("ユーザー") }, { status: 500 });
  }
}