import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { getUserId } from "@/services/UserService";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      dbUserId?: string;
    } & DefaultSession["user"];
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true, // これをtrueにすることで、スマホブラウザがHTTPS環境でCookieを許可しやすくなります
      },
    },
  },

  

  // ★★★ これが無いとセッションが作られない ★★★
  session: {
    strategy: "jwt",
    //maxAge: 600,
    maxAge: 1 * 24 * 60 * 60,

  },

  callbacks: {
    async jwt({ token, user }: { token: JWT; user: any }) {
      if (user) {
        token.id = user.id;
      }

      if (token.id && !token.dbUserId) {
        try {
          const dbUser = await getUserId(token.id as string);
          if (dbUser) {
            token.dbUserId = dbUser.id; // データベースのUUIDをセット
          }
        } catch (e) {
          console.error("ユーザー情報の取得に失敗しました", e);
        }
      }
      return token;
    },
  
    async session({ session, token }: { session: any; token: JWT }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.dbUserId = token.dbUserId as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
