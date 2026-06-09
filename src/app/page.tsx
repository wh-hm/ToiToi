"use client"
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession, SessionProvider } from "next-auth/react";

function TopPageContent() {
    const router = useRouter();
    const { data: session, status } = useSession();

    //ログインの処理
    useEffect(() => {
        if (status === "authenticated" && session?.user) {
            const checkUser = async () => {
                try {
                    const res = await fetch("/api/login/create", {
                        method: "POST",
                        body: JSON.stringify({ 
                            google_id: session.user.id, 
                            email: session.user.email 
                        }),
                    });

                    if (res.ok) {
                        // 成功したら遷移
                        router.push("/username");
                    } else {
                        // 失敗したらアラートやコンソールで通知
                        console.log("Status Code:", res.status);
  
                        // レスポンスの本文をテキストとして取得して表示
                        const errorText = await res.text();
                        console.error("API Error Response Body:", errorText);
                        console.error("API Error Detail:", res);
                        alert("登録処理に失敗しました。");
                    }
                } catch (error) {
                    console.error("API Error:", error);
                    alert("サーバーとの通信に失敗しました。");
                }
            };

            checkUser();
        }
    }, [status, session, router]); // statusなどが変わった時だけ実行される

    // 読み込み中（一瞬ボタンが見えちゃうのを防ぐ）
    if (status === "loading") {
        return <p style={{ textAlign: "center", marginTop: "50px" }}>読み込み中...</p>;
    }

    

    return (
        <section id="Login" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <h1 style={{ fontSize: "3rem", marginBottom: "20px" }}>ToiToi</h1>
        <div>
            <button
            onClick={() => signIn("google")}
            >
            Googleアカウントでログイン
            </button>
        </div>
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
