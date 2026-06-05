import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { getChats, registerChat } from "@/services/ChatService";
import { uploadImage } from "@/services/StorageService";
import { MESSAGES } from "@/constants/messages";

// 1. GET: チャット一覧取得
export async function GET(request: NextRequest) {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const spaceId = Number(searchParams.get("spaceId"));

    if (!spaceId || isNaN(spaceId)) {
        return NextResponse.json({ error: MESSAGES.E1001("スペースID") }, { status: 400 });
    }

    try {
        const questions = await getChats(auth.user_id, spaceId);
        return NextResponse.json(questions);
    } catch (error) {
        return NextResponse.json({ error: MESSAGES.E2003("チャット") }, { status: 500 });
    }
}


export async function POST(request: NextRequest) {
  // ... 認証処理などはそのまま
  const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const formData = await request.formData();
    const message = formData.get("message") as string;
    const file = formData.get("image") as File | null;
    const space_id = Number(formData.get("space_id"));
    const stamp = formData.get("stamp") as string | null;
    let imageUrl: string | undefined;
    // 1. 必須チェック (E1001)
    if (!message && !file && !stamp) {
      return NextResponse.json({ error: MESSAGES.E1001("チャット内容") }, { status: 400 });
    }

    // 2. 桁数チェック (E1002)
    if (message && message.length > 100) {
      return NextResponse.json({ error: MESSAGES.E1002("チャット内容", 100) }, { status: 400 });
    }

    


    // 3. 画像バリデーション (E1005)
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: MESSAGES.E1005 }, { status: 400 });
      }
      const validTypes = ["image/png", "image/jpeg", "image/jpg"];
      if (!validTypes.includes(file.type)) {
        return NextResponse.json({ error: MESSAGES.E1005}, { status: 400 });
      }

      imageUrl = await uploadImage(file, auth.user_id, space_id);
    }
    // 4. 登録（サニタイズはサービス層で行われるため、ここでは何もせず渡す）
    const newChat = await registerChat({
        user_id: auth.user_id,
        space_id,
        message,
        image_url: imageUrl || undefined,
        stamp: stamp || undefined
    });

    

    return NextResponse.json(newChat, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: MESSAGES.E2001("チャット") }, { status: 500 });
  }
}