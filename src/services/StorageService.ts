import { prisma } from "@/lib/prisma";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command} from "@aws-sdk/client-s3"; // 追加
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

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;

/**
 * 設計書の getImages メソッドの実装
 */
export async function getImages(imageIds: number[]): Promise<Map<number, string>> {
  if (!imageIds || imageIds.length === 0) return new Map();

  // 1. IDに基づいてDBから画像情報を取得
  const images = await prisma.image.findMany({
    where: { id: { in: imageIds }, delete_flag: 0 }
  });

  const urlMap = new Map<number, string>();
  
  // 2. 署名付きURLを生成して Map に格納
  await Promise.all(images.map(async (img) => {
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: img.storage_key });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    // キーを number (ID) にする
    urlMap.set(img.id, url);
  }));

  return urlMap;
}

/**
 * メソッド名称：getImageCount
 * 概要：画像がアップロードされている数を取得
 */
export async function getImageCount(userId: string): Promise<number> {
  // チャットと質問チャットの image_id が存在する件数を合計
  const [chatCount, questionChatCount] = await Promise.all([
    prisma.chat.count({ where: { user_id: userId, delete_flag: 0, image_id: { not: null } } }),
    prisma.questionChats.count({ where: { user_id: userId, delete_flag: 0, image_id: { not: null } } })
  ]);
  return chatCount + questionChatCount;
}


/**
 * 画像を1つ物理削除する
 */
export async function deleteImage(imageKey: string): Promise<boolean> {
  if (!imageKey?.trim()) return false;

  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: imageKey }));
    return true;
  } catch (error) {
    console.error("deleteImage: 削除失敗", error);
    return false;
  }
}

export async function deleteImages(imageIds: number[]): Promise<boolean> {
  // 1. DBから対象の storage_key を取得
  const images = await prisma.image.findMany({
    where: { id: { in: imageIds } },
    select: { id: true, storage_key: true }
  });

  if (images.length === 0) return true;

  // 2. オブジェクトストレージから物理削除
  await s3Client.send(new DeleteObjectsCommand({
    Bucket: BUCKET_NAME,
    Delete: { 
      Objects: images.map(img => ({ Key: img.storage_key })) 
    },
  }));

  // 3. DBからレコードを物理削除
  await prisma.image.updateMany({
    where: { id: { in: images.map(i => i.id) } },
    data: {
      delete_flag: 1
    }
  });

  return true;
}

/**
 * 画像をR2にアップロードして、ファイル名を返す関数
 */
// StorageService.ts の修正
export async function uploadImages(images: File[], userId: string, spaceId: number): Promise<string[]> {
  let currentCount = await getImageCount(userId);

  // 全画像を並列でアップロードするタスクを作成
  const uploadTasks = images.map(async (image, index) => {
    const fileName = `${userId}_${spaceId}_${(currentCount + index + 1).toString().padStart(3, '0')}.png`;
    
    // R2アップロード
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: Buffer.from(await image.arrayBuffer()),
      ContentType: image.type,
    }));

    // DB登録もここで済ませる
    await prisma.image.create({
      data: { storage_key: fileName, size_bytes: image.size, mime_type: image.type }
    });

    return fileName;
  });

  // すべての処理が完了するのを待つ
  return await Promise.all(uploadTasks);
}

export async function getAuthorizedImageIds(userId: string): Promise<number[]> {
  // 1. 全スペース取得
  // 2. Imageテーブルを直接検索し、紐付いているチャット/質問チャットからスペースIDを逆引きする
  const images = await prisma.image.findMany({
    where: {
      OR: [
        {
          chats: {
            some: {
              space: { user_id: userId, delete_flag: 0 }
            }
          }
        },
        {
          questionChats: {
            some: {
              question: {
                space: { user_id: userId, delete_flag: 0 }
              }
            }
          }
        }
      ]
    },
    select: { id: true }
  });

  return images.map(img => img.id);
}