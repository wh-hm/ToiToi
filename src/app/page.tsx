"use client";

import LoginForm from "../features/auth/LoginForm";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession, SessionProvider } from "next-auth/react";

function TopPageContent() {
    const router = useRouter();
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === "authenticated" && session?.user) {
            const checkUser = async () => {
                try {
                    const res = await fetch("/api/login/create", {
                        method: "POST",
                        body: JSON.stringify({
                            google_id: session.user.id,
                            email: session.user.email,
                        }),
                    });

                    if (res.ok) {
                        router.push("/username");
                    } else {
                        const errorText = await res.text();
                        console.error("API Error Response Body:", errorText);
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

    if (status === "loading") {
        return <p style={{ textAlign: "center", marginTop: "50px" }}>読み込み中...</p>;
    }

    return (
        <section id="Login">
            <h1>ToiToi</h1>
            <LoginForm />
        </section>
    );
}

export default function TopPage() {
    return (
        <SessionProvider>
            <Header />
            <TopPageContent />
            <Footer />
        </SessionProvider>
    );
}
