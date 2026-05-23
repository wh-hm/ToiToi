import { prisma } from "@/lib/prisma";

export const registerLoginManagement = async (tx: any, user_id: string) => {
    await tx.loginManagement.create({
        data: {
        user_id: user_id,
        total_login_days: 1,
        current_streak: 1,
        },
    });
};