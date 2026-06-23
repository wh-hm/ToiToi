"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession, SessionProvider } from "next-auth/react";

function TopPageContent() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [isAppBrowser, setIsAppBrowser] = useState(false);

    // 1. アプリ内ブラウザの判定
    useEffect(() => {
        const ua = window.navigator.userAgent.toLowerCase();
        const patterns = ["line", "fbav", "fb_iab", "instagram", "twitter", "tiktok", "wv", "messenger", "snapchat"];
        const isEmbedded = patterns.some((pattern) => ua.includes(pattern));
        setIsAppBrowser(isEmbedded);
    }, []);

    // 2. ログイン後の処理
    useEffect(() => {
        if (status === "authenticated" && session?.user) {
            const checkUser = async () => {
                try {
                    const res = await fetch("/api/auth/login/", {
                        method: "POST",
                        body: JSON.stringify({ 
                            google_id: session.user.id, 
                            email: session.user.email 
                        }),
                    });

                    if (res.ok) {
                        const resCheck = await fetch(`/api/user/username/check`);
                        const data = await resCheck.json();
                        if (data.hasUsername) {
                            router.push("/dashboard");
                        } else {
                            router.push("/username");
                        }
                    } else {
                        alert("登録処理に失敗しました。");
                    }
                } catch (error) {
                    console.error("API Error:", error);
                }
            };
            checkUser();
        }
    }, [status, session, router]);

    // 読み込み中
    if (status === "loading") {
        return <div style={{ textAlign: "center", marginTop: "50px" }}>読み込み中...</div>;
    }

    return (
        <section style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" }}>
            <h1 style={{ fontSize: "3rem", marginBottom: "20px" }}>ToiToi</h1>

            {/* アプリ内ブラウザなら「ブラウザで開くボタン」を表示 */}
            {isAppBrowser ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                    <p>このアプリ内ではログインできません。</p>
                    <button onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        alert("URLをコピーしました！ブラウザ（Safari/Chrome）を開いて貼り付けてください。");
                    }}>
                        URLをコピーしてブラウザで開く
                    </button>
                </div>
            ) : (
                /* 通常のログインUI */
                <div style={{ textAlign: "center" }}>
                    
                    <button onClick={() => signIn("google")} style={{ padding: "10px 20px" }}>
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