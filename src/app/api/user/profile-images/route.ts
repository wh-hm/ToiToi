import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { updateUser } from "@/services/UserService";
import { uploadProfileImage, getImages } from "@/services/StorageService";
import { MESSAGES } from "@/constants/messages";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg"];

export async function PATCH(request: NextRequest) {
  const auth = await getAuthContext();
  if ("error" in auth) {
    return NextResponse.json({ message: auth.error, code: auth.code }, { status: auth.status });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ message: MESSAGES.E1013("プロフィール画像") }, { status: 400 });
    }

    const lowerName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (file.size > MAX_FILE_SIZE || !ALLOWED_TYPES.includes(file.type) || !hasValidExt) {
      return NextResponse.json({ message: MESSAGES.E1005(1) }, { status: 400 });
    }

    const imageId = await uploadProfileImage(file, auth.user_id);
    await updateUser(auth.user_id, { profile_image_id: imageId });

    const urlMap = await getImages([imageId]);
    const profileImageUrl = urlMap.get(imageId) || null;

    return NextResponse.json(
      {
        profileImageUrl,
        message: MESSAGES.S1002("プロフィール画像"),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("【プロフィール画像更新エラー】", error);
    return NextResponse.json({ message: MESSAGES.E2002("プロフィール画像") }, { status: 500 });
  }
}