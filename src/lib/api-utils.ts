import { signOut } from "next-auth/react";
import { ToiToiNotification } from "@/components/Toast";
import { MESSAGES } from "@/constants/messages";

export const handleApiResponse = async (res: Response) => {
    // エラーデータを取得
    const errorData = await res.json().catch(() => ({}));
    console.log(errorData);

    // 1. 403 Forbidden（削除済みユーザーなど）
    if (res.status === 403) {
        if (errorData.code === "USER_DELETED") {
            // ★ sessionStorage にメッセージを保存してからリダイレクト
            sessionStorage.setItem("flash_message", errorData.message || "アカウントが無効です。");
            signOut({ callbackUrl: "/" });
            return;
        } else {
            ToiToiNotification.error(errorData.message || "権限がありません。");
        }
    } 
    // 2. 404 Not Found（対象が見つからない）
    else if (res.status === 404) {
        // ★ sessionStorage にメッセージを保存してからリダイレクト
        sessionStorage.setItem("flash_message", errorData.message || "データが見つかりません。");
        window.location.href = "/404";
        return;
    } else if(res.status === 401){
        sessionStorage.setItem("flash_message", errorData.message || MESSAGES.E4003);
        signOut({ callbackUrl: "/" });
        return;
    }
    // 3. その他エラー
    else {
        ToiToiNotification.error(errorData.message || "エラーが発生しました。");
    }
    throw new Error();
};