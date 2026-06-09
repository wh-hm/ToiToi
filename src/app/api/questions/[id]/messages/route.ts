// app/api/questions/[id]/messages/route.ts
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { getQuestionChats, registerQuestionChat } from "@/services/QuestionChatService";
import { uploadImage } from "@/services/StorageService";
import { MESSAGES } from "@/constants/messages";
import { getQuestion } from "@/services/QuestionService";

// 1. メッセージ一覧取得 (GET)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id : string }> } // パラメータ名は "id" だけでOK
) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  if (!id) {
    return NextResponse.json({ error: "IDが取得できません" }, { status: 400 });
  }

  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  // const { id } = await params; // ここで id (spaceIdのこと) を取得
  try {
    // 取得した値を parseInt してサービスに渡す
    const messages = await getQuestionChats(
      parseInt(id), 
      auth.user_id, 
    );

    const question = await getQuestion(
      parseInt(id),
      auth.user_id
    )
    
    // データが null なら空配列 [] を返すようにする
    // オブジェクトとしてまとめて返す
    return NextResponse.json({
      messages: messages || [],
      question: question || null
    });
  } catch (error) {
    console.error("一覧取得エラー:", error);
    return NextResponse.json({ error: "取得失敗" }, { status: 500 });
  }
}
// 2. メッセージ送信 (POST)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;

  try {

    const formData = await request.formData();
    const message = formData.get("message") as string;
    const file = formData.get("image") as File | null;
    const image_url = formData.get("image_url") as string;
    const stamp = formData.get("stamp") as string | null;
    const space_id = Number(formData.get("space_id"));
    let imageUrl: string | undefined;

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
    // 簡易バリデーション
    const newMessage = await registerQuestionChat(parseInt(id), auth.user_id, message, imageUrl, stamp);
    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error("送信エラー:", error);
    return NextResponse.json({ error: MESSAGES.E2001("メッセージ送信") }, { status: 500 });
  }
}

