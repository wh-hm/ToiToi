import { prisma } from "@/lib/prisma";

// 全ユーザーを取得する関数
export async function getAllUsers() {
    return await prisma.user.findMany();
}

// ユーザーを新しく登録する関数
export async function createUser(data: { email: string; name: string }) {
    return await prisma.user.create({ data });
}