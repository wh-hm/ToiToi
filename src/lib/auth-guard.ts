import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserId } from "@/services/UserService";
import { MESSAGES } from "@/constants/messages";

export async function getAuthContext() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: MESSAGES.USER001, status: 401 };
    
    const user_id = await getUserId(session.user.id);
    if (!user_id) return { error: MESSAGES.USER001, status: 404 };
    
    return { user_id };
}