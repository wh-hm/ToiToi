"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export const useLogin = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginWithGoogle = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // ★ ダミー処理：1秒待ってダッシュボードへ
      await new Promise((resolve) => setTimeout(resolve, 1000));

      router.push("/dashboard");
    } catch (err) {
      setError("ログインに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, error, loginWithGoogle };
};
