"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession, SessionProvider } from "next-auth/react";

function TopPageContent() {
    const router = useRouter();
    const { data: session, status } = useSession();

    // ログイン後の処理
    useEffect(() => {
        if (status === "authenticated" && session?.user) {
            const checkUser = async () => {
                try {
                    // ユーザー登録・ログイン判定API
                    const res = await fetch("/api/auth/login/", {
                        method: "POST",
                        body: JSON.stringify({ 
                            google_id: session.user.id, 
                            email: session.user.email 
                        }),
                    });

                    if (res.ok) {
                        // ユーザーネーム登録状況の確認
                        try {
                            const res = await fetch(`/api/user/username/check`);
                            const data = await res.json();
                            
                            if (data.hasUsername) {
                                router.push("/dashboard");
                            } else {
                                router.push("/username");
                            }
                        } catch (error) {
                            console.error("Username check error:", error);
                        }
                    } else {
                        console.error("Login API Error:", res.status);
                        alert("登録処理に失敗しました。");
                    }
                } catch (error) {
                    console.error("API Error:", error);
                    alert("サーバーとの通信に失敗しました。");
                }
            };

            checkUser();
        }
    }, [status, session, router]);

    // 読み込み中の表示
    if (status === "loading") {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <p>読み込み中...</p>
            </div>
        );
    }

    return (
        <section id="Login" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" }}>
            <h1 style={{ fontSize: "3rem", marginBottom: "20px" }}>ToiToi</h1>
            
            {/* ログイン状態に応じてUIを切り替える */}
            {status === "authenticated" ? (
                <div style={{ textAlign: "center", border: "1px solid #ccc", padding: "20px", borderRadius: "8px" }}>
                    <p style={{ marginBottom: "10px" }}>ログイン済みです。セッションが錯書できなかったので、臨時ではいってます</p>
                    <button 
                        onClick={() => signOut()}
                        style={{ padding: "10px 20px", cursor: "pointer", backgroundColor: "#ff4444", color: "white", border: "none", borderRadius: "5px" }}
                    >
                        強制ログアウトしてリセット
                    </button>
                </div>
            ) : (
                <div>
                    <button 
                        onClick={() => signIn("google")}
                        style={{ padding: "10px 20px", cursor: "pointer" }}
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