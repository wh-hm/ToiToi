// src/components/AuthGuard.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  
  // 前回のセッション状態を保持する（リレンダリング時に比較するため）
  const lastStatus = useRef(status);

  useEffect(() => {
    // 状態が「ログイン済み」から「未ログイン」に変わった時だけリフレッシュ
    if (lastStatus.current === "authenticated" && status === "unauthenticated") {
      router.refresh(); // これがブラウザのリロードなしでサーバーコンポーネントを再取得する魔法です
    }
    
    // 現在のステータスを次回の比較のために保存
    lastStatus.current = status;
  }, [status, router]);

  return <>{children}</>;
}