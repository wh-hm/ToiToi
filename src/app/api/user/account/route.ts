import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { deleteUser } from "@/services/UserService";
import { MESSAGES } from "@/constants/messages";
import { getUser } from "@/services/UserService";
import { getSpaces } from "@/services/SpaceService";
import { getImageCount } from "@/services/StorageService";

export async function GET(request: NextRequest) {
  // 1. 認証チェック
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    // 2. 複数のサービスを並列実行して効率化
    // Promise.allを使うことで、各処理を待ち合わせる時間を短縮します
    const [user, spaces, imageCount] = await Promise.all([
      getUser(auth.user_id),
      getSpaces(auth.user_id),
      getImageCount(auth.user_id)
    ]);

    const result = {
      type1: spaces.filter(s => s.space_type === 1),
      type2: spaces.filter(s => s.space_type === 2),
      type3: spaces.filter(s => s.space_type === 3),
    };
    
    // 3. ユーザー存在チェック
    if (!user) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
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
      { error: "データの取得に失敗しました" }, 
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // 1. 認証とユーザーID取得を共通化
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    // 2. ユーザー削除（論理削除）の実行
    const success = await deleteUser(auth.user_id);
    
    if (!success) {
      // 削除対象が見つからない、または権限がない場合
      return NextResponse.json({ error: MESSAGES.E2001("ユーザー削除") }, { status: 404 });
    }

    return NextResponse.json({ message: "ユーザーを削除しました" });
  } catch (error) {
    console.error("【ユーザー削除エラー】", error);
    return NextResponse.json({ error: MESSAGES.E2001("ユーザー削除") }, { status: 500 });
  }
}