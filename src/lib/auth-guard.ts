import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserId } from "@/services/UserService";
import { MESSAGES } from "@/constants/messages";

export async function getAuthContext() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: MESSAGES.E4003, status: 401 };
    
    // 1. ユーザーを検索
    const user = await getUserId(session.user.id);
    
    // 2. そもそもユーザーが存在しない場合
    if (!user) return { error: MESSAGES.E1010("ユーザー"), status: 404 };

    // 3. 削除済みの場合
    if (user.delete_flag === 1) {
        return { error: MESSAGES.E2005("ユーザー"), code: "USER_DELETED", status: 403 };
    }
    
    // 全てクリアすれば user_id を返す
    return { user_id: user.id };
}