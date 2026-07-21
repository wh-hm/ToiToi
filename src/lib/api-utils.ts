import { signOut } from "next-auth/react";
import { ToiToiNotification } from "@/components/Toast";

export const handleApiResponse = async (res: Response) => {
    
    // if (res.ok) return res;

  // エラーデータを取得
    const errorData = await res.json().catch(() => ({}));

    // 1. 403 Forbidden（削除済みユーザーなど）
    if (res.status === 403) {
        if (errorData.code === "USER_DELETED") {
            ToiToiNotification.error(errorData.message);
            await signOut({ callbackUrl: '/' });
            
        } else {
            ToiToiNotification.error(errorData.message || "権限がありません。");
        }
    } 
    // 2. 404 Not Found（対象が見つからない）
    else if (res.status === 404) {
        ToiToiNotification.error(errorData.message || "データが見つかりません。");
        window.location.href = "/404";
    }
  // 3. その他エラー
    else {
        ToiToiNotification.error(errorData.message || "エラーが発生しました。");
    }
    throw new Error;
};