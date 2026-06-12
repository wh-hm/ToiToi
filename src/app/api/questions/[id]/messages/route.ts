// app/api/questions/[id]/messages/route.ts
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { getQuestionChats, registerQuestionChat } from "@/services/QuestionChatService";
import { uploadImage, deleteImage } from "@/services/StorageService";
import { MESSAGES } from "@/constants/messages";
import { getQuestion } from "@/services/QuestionService";
import Question from "@/app/question/[spaceId]/page";
import { prisma } from "@/lib/prisma";

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
  const questionId = parseInt(id);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  // const { id } = await params; // ここで id (spaceIdのこと) を取得
  try {
    
    // ★ 並列処理に修正：Promise.all で同時に取得する
    const [messages, question] = await Promise.all([
      getQuestionChats(questionId, auth.user_id),
      getQuestion(questionId, auth.user_id)
    ]);
    
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
  let imageUrl: string | undefined;

  try {

    const formData = await request.formData();
    const message = formData.get("message") as string;
    const file = formData.get("image") as File | null;
    const image_url = formData.get("image_url") as string;
    const stamp = formData.get("stamp") as string | null;
    const space_id = Number(formData.get("space_id"));

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
    const newMessage = await prisma.$transaction(async (tx) => {
      return await registerQuestionChat(
        parseInt(id),
        auth.user_id,
        message || undefined,
        imageUrl,
        stamp || undefined,
        tx
      );
    });
    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    // 5. エラー処理 (画像だけアップロード成功してDB登録失敗した場合のリカバリー)
    if (imageUrl) {
      console.error("エラー発生。アップロード済みの画像を削除します:", imageUrl);
      await deleteImage(imageUrl).catch(e => console.error("削除失敗:", e));
    }
    console.error("質問作成エラー:", error);
    return NextResponse.json({ error: MESSAGES.E2001("質問") }, { status: 500 });
  }
}

