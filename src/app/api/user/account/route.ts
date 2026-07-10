import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { deleteUser } from "@/services/UserService";
import { MESSAGES } from "@/constants/messages";
import { getUser } from "@/services/UserService";
import { getSpaces } from "@/services/SpaceService";
import { getImageCount } from "@/services/StorageService";

export async function GET() {
  // 1. 認証チェック
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    // 2. 複数のサービスを並列実行して効率化
    // Promise.allを使うことで、各処理を待ち合わせる時間を短縮します
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
    
    // 3. ユーザー存在チェック
    if (!user) {
      return NextResponse.json({ message: MESSAGES.E1010("ユーザー") }, { status: 404 });
    }

    // 4. 全データをまとめてレスポンス
    // フロント側で「データが空かどうか」を判定できるように全て返します
    return NextResponse.json({ 
      user, 
      spaces: result, 
      imageCount 
    });

  } catch (error) {
    // 各サービス内で発生したエラーをキャッチ
    console.error("【マイページデータ取得エラー】", error);
    return NextResponse.json(
      { message: MESSAGES.E2003("アカウント情報") },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  // 1. 認証とユーザーID取得を共通化
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

  try {
    // 2. ユーザー削除（論理削除）の実行
    const success = await deleteUser(auth.user_id);
    
    if (!success) {
      // 削除対象が見つからない、または権限がない場合
      return NextResponse.json(
        { message: MESSAGES.E1010("ユーザー") },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: MESSAGES.S1003("ユーザー") });
  } catch (error) {
    console.error("【ユーザー削除エラー】", error);
    return NextResponse.json({ message: MESSAGES.E2004("ユーザー") }, { status: 500 });
  }
}