import NextAuth from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
        id: string; // ここで id を追加します
        name?: string | null;
        email?: string | null;
        image?: string | null;
        };
    }
}