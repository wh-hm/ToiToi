import { prisma } from "@/lib/prisma";


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
export async function uploadImage(image: File, user_id: string, space_id: string | number) {
  // 1. ファイル名生成（ルール：ユーザーID_スペースID_投稿日時）
  const timestamp = Date.now();
  const fileName = `${user_id}_${space_id}_${timestamp}.png`;

  // 2. ここに実際のストレージアップロード処理を記述
  // (例: S3へのアップロード処理など)
  // const uploadedPath = await s3Client.send(...);
  
  // 3. アップロード成功後のURLを返す
  return `https://your-storage-url/${fileName}`;
}


export async function deleteImages(image_url: string[]){

}