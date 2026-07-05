"use client";

import { SessionProvider, getSession, useSession } from "next-auth/react";
import { useEffect } from "react";

function SessionGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    const forceCheckSession = async () => {
      const session = await getSession();
      
      // 💡 クッキーが消されていたら、LayoutWrapper 側に通知を送る！
      if (!session) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("session-forced-expired"));
        }
      }
    };

    const handleFocus = () => forceCheckSession();
    const handleClick = () => forceCheckSession();

    window.addEventListener("focus", handleFocus);
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("click", handleClick);
    };
  }, [status]);

  return <>{children}</>;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={30} refetchOnWindowFocus={false}>
      <SessionGuard>{children}</SessionGuard>
    </SessionProvider>
  );
}