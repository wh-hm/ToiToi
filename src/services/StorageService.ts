import { prisma } from "@/lib/prisma";
import { S3Client, PutObjectCommand, GetObjectCommand} from "@aws-sdk/client-s3"; // 追加
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3クライアントの初期化（lib/s3.tsなどに切り出すとより綺麗です）
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/**
 * 設計書の getImages メソッドの実装
 * @param image_urls R2のファイル名（Key）の配列
 */
export async function getImages(image_urls: string[]): Promise<string[]> {
  // 1. 入力検証
  if (!image_urls || image_urls.length === 0) {
    return [];
  }

  try {
    // 2. ストレージアクセス（並列処理）
    const urlPromises = image_urls.map(async (key) => {
      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      });
      // 一時的な公開URL（署名付きURL）を発行（有効期限は60分など）
      return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    });

    // Promise.all で並列にURLを取得
    const imageUrls = await Promise.all(urlPromises);

    // 3. データ返却
    return imageUrls;
  } catch (error) {
    console.error("画像取得エラー:", error);
    // 設計書の通り、エラー時は null または空配列などを返す処理
    return []; 
  }
}

/**
 * メソッド名称：getImageCount
 * 概要：画像がアップロードされている数を取得
 */
export async function getImageCount(user_id: string): Promise<number> {
  try {
    // 共通のフィルタ条件
    // image_url が "" でもなく、かつ null でもないデータを取得する
    const filter = {
      user_id: user_id,
      delete_flag: 0,
      NOT: [
        { image_url: "" },
        { image_url: null }
      ]
    };

    // 1. チャットの画像をカウント
    const chatImageCount = await prisma.chat.count({ where: filter });

    // 2. 質問チャットの画像をカウント
    const questionChatImageCount = await prisma.questionChats.count({ where: filter });

    return chatImageCount + questionChatImageCount;
  } catch (error) {
    throw error;
  }
}
export async function deleteImage(image_url: string){

}

// --- 💡 もし「すでに別で getChats / getQuestionChats という関数がある」場合の別パターン表記 ---
// 既存の関数が配列を返す仕様であれば、以下のように length や filter を組み合わせる形でもスマートに実装可能です。
/*
export async function getImageCountAlternative(user_id: string): Promise<number> {
  try {
    // 既存のサービス関数からデータを取得（例）
    const chats = await getChats(user_id);
    const questionChats = await getQuestionChats(user_id);

    // image_url が空文字（""）でも null でも undefined でもないものをフィルタリングして数える
    const chatImages = chats.filter(c => c.image_url && c.image_url !== "").length;
    const questionImages = questionChats.filter(q => q.image_url && q.image_url !== "").length;

    return chatImages + questionImages;
  } catch (error) {
    throw error;
  }
}
*/
// 既存のメソッドを引数に合わせて書き換え
/**
 * 画像をR2にアップロードして、ファイル名を返す関数
 */
export async function uploadImage(image: File, user_id: string, space_id: string | number) {
  // 1. ファイル名の生成 (ユニークにするためにUUIDも活用するとより安全です)
  const currentCount = await getImageCount(user_id);
  //  常に「現在の数 + 1」を使うことで、自動的に連番になる
  const nextSequence = currentCount + 1;
  const fileName = `${user_id}_${space_id}_${nextSequence.toString().padStart(3, '0')}.png`;
  // 2. ファイルをArrayBufferに変換
  const arrayBuffer = await image.arrayBuffer();

  // 3. R2へアップロード実行
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: Buffer.from(arrayBuffer),
        ContentType: image.type,
      })
    );
  } catch (error) {
    console.error("R2 Upload Error:", error);
    throw new Error("画像のアップロードに失敗しました");
  }

  // 4. アップロードされたファイル名を返す
  return fileName;
}