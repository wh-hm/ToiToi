"use client";

import { useEffect, useState } from "react";
import { signIn, SessionProvider } from "next-auth/react";

function TopPageContent() {
    const [isAppBrowser, setIsAppBrowser] = useState(false);

    // 1. アプリ内ブラウザの判定
    useEffect(() => {
        const ua = window.navigator.userAgent.toLowerCase();
        const patterns = ["line", "fbav", "fb_iab", "instagram", "twitter", "tiktok", "wv", "messenger", "snapchat"];
        const isEmbedded = patterns.some((pattern) => ua.includes(pattern));
        setIsAppBrowser(isEmbedded);
    }, []);

    // 2. ログインボタンを押した時の処理
    const handleGoogleLogin = () => {
        // NextAuthがGoogleにリクエストを送る際、強制的に「アカウント選択画面」を出させる正しい指定方法です
        signIn("google", { 
            callbackUrl: "/dashboard" 
        }, { 
            prompt: "select_account" // 第3引数のカスタムパラメータとして渡すことで、確実にGoogleへ伝わります
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
                    {/* ボタンをクリックするまで、裏での自動遷移やチェックは一切行いません */}
                    <button 
                        onClick={handleGoogleLogin} 
                        style={{ padding: "10px 20px", cursor: "pointer", fontSize: "1.2rem" }}
                    >
                        Googleアカウントでログイン
                    </button>
                </div>
            )}
        </section>
    );
}

export default function TopPage() {
    return (
        <SessionProvider>
            <TopPageContent />
        </SessionProvider>
    );
}