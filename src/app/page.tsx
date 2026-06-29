"use client";

import { useEffect, useState, useTransition } from "react";
import { signIn, SessionProvider } from "next-auth/react";
import { useRouter } from "next/navigation";

function TopPageContent() {
    const [isAppBrowser, setIsAppBrowser] = useState(false);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    // 1. アプリ内ブラウザの判定
    useEffect(() => {
        const ua = window.navigator.userAgent.toLowerCase();
        const patterns = ["line", "fbav", "fb_iab", "instagram", "twitter", "tiktok", "wv", "messenger", "snapchat"];
        const isEmbedded = patterns.some((pattern) => ua.includes(pattern));
        setIsAppBrowser(isEmbedded);
    }, []);

    // 2. ログインボタンを押した時の処理
    const handleGoogleLogin = async () => {
        // startTransitionを使って、状態変化を優先的に処理させる
        startTransition(async () => {
            await signIn("google", { 
                callbackUrl: "/dashboard" 
            }, { 
                prompt: "select_account" 
            });
            // ログイン処理が完了したタイミングでルーターをリフレッシュ
            router.refresh();
        });
    };

    return (
        <section style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" }}>
            <h1 style={{ fontSize: "3rem", marginBottom: "20px" }}>ToiToi</h1>

            {isAppBrowser ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                    <p>このアプリ内ではログインできません。</p>
                    <button onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        alert("URLをコピーしました！ブラウザを開いて貼り付けてください。");
                    }}>
                        URLをコピーしてブラウザで開く
                    </button>
                </div>
            ) : (
                <div style={{ textAlign: "center" }}>
                    <button 
                        onClick={handleGoogleLogin} 
                        disabled={isPending}
                        style={{ padding: "10px 20px", cursor: "pointer", fontSize: "1.2rem" }}
                    >
                        {isPending ? "ログイン中..." : "Googleアカウントでログイン"}
                    </button>
                </div>
            )}
        </section>
    );
}

export default function TopPage() {
    return (
        <SessionProvider>
            {/* AuthGuardでラップすることで、ページ全体でセッション状態の同期を監視 */}
            <TopPageContent />
        </SessionProvider>
    );
}