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
 * @param image_urls R2のファイル名（Key）の配列
 */
export async function getImages(imageUrls: string[]): Promise<string[]> {
  if (!imageUrls || imageUrls.length === 0) return [];

  try {
    return await Promise.all(
      imageUrls.map(async (key) => {
        const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
        return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      })
    );
  } catch (error) {
    console.error("画像取得エラー:", error);
    return [];
  }
}

/**
 * メソッド名称：getImageCount
 * 概要：画像がアップロードされている数を取得
 */
export async function getImageCount(userId: string): Promise<number> {
  const filter = {
    user_id: userId,
    delete_flag: 0,
    AND: [
      { image_url: { not: null } },
      { image_url: { not: "" } }
    ]
  };

  const [chatCount, questionChatCount] = await Promise.all([
    prisma.chat.count({ where: filter }),
    prisma.questionChats.count({ where: filter })
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

export async function deleteImages(userId: string) {
  try {
    const listCommand = new ListObjectsV2Command({ Bucket: BUCKET_NAME, Prefix: userId });
    const listedObjects = await s3Client.send(listCommand);

    if (listedObjects.Contents?.length) {
      await s3Client.send(new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: { Objects: listedObjects.Contents.map(({ Key }) => ({ Key })) },
      }));
    }

    const updateFilter = {
      user_id: userId,
      delete_flag: 0,
      AND: [
        { image_url: { not: null } },
        { image_url: { not: "" } }
      ]
    };
    await Promise.all([
      prisma.chat.updateMany({ where: updateFilter, data: { delete_flag: 1 } }),
      prisma.questionChats.updateMany({ where: updateFilter, data: { delete_flag: 1 } })
    ]);
    
    return { count: listedObjects.Contents?.length || 0 };
  } catch (error) {
    console.error("一括削除処理エラー:", error);
    throw error;
  }
}

/**
 * 画像をR2にアップロードして、ファイル名を返す関数
 */
export async function uploadImages(images: File[], userId: string, spaceId: number) {
  let currentCount = await getImageCount(userId);
  const uploadedFileNames: string[] = [];

  for (const image of images) {
    currentCount += 1;
    const fileName = `${userId}_${spaceId}_${currentCount.toString().padStart(3, '0')}.png`;
    
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: Buffer.from(await image.arrayBuffer()),
        ContentType: image.type,
      }));
      uploadedFileNames.push(fileName);
    } catch (error) {
      console.error("R2 Upload Error:", error);
      throw new Error("画像のアップロードに失敗しました");
    }
  }

  return uploadedFileNames;
}