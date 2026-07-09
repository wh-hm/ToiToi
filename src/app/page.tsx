"use client";

import { useEffect, useState, useRef } from "react";
import { signIn, SessionProvider, useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { useRouter } from 'next/navigation';
import { ToiToiNotification } from "@/components/Toast";

function TopPageContent() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [isAppBrowser, setIsAppBrowser] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isButtonClick, setIsButtonClick] = useState(false);

    
    // 一度だけ実行するためのフラグ（useEffectの二重発火防止）
    const initializedRef = useRef(false);

    // 1. アプリ内ブラウザの判定
    useEffect(() => {
        const ua = window.navigator.userAgent.toLowerCase();
        const patterns = ["line", "fbav", "fb_iab", "instagram", "twitter", "tiktok", "wv", "messenger", "snapchat"];
        const isEmbedded = patterns.some((pattern) => ua.includes(pattern));
        setIsAppBrowser(isEmbedded);
    }, []);

    // 2. 認証状態の監視と初期化処理
    useEffect(() => {
        const shouldInit = localStorage.getItem("pending_initialization");

        if (status === "authenticated" && shouldInit === "true" && !isProcessing && !initializedRef.current) {
            initializedRef.current = true;
            localStorage.removeItem("pending_initialization");
            initializeUser();
        }
    }, [status, isProcessing]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 3000);
        } catch (err) {
            ToiToiNotification.error("URLのコピーに失敗しました。");
        }
    };

    // 初期化と遷移のロジック
    const initializeUser = async () => {
        setIsProcessing(true);
        try {
            const res = await fetch("/api/auth/login", { method: "POST" });
            const loginData = await res.json();
            if (!res.ok) {
                throw new Error(loginData.message || "ログイン処理に失敗しました");
            }

            const checkRes = await fetch("/api/user/username/check");
            const data = await checkRes.json();
            if (!checkRes.ok) {
                throw new Error(data.message || "ユーザー確認に失敗しました");
            }

            if (data.hasUsername) {
                router.push('/dashboard');
                ToiToiNotification.success(loginData.message);
            } else {
                router.push('/username');
                ToiToiNotification.success(loginData.message);
            }
        } catch (err: any) {
            await signOut({ redirect: false });
            ToiToiNotification.error(err.message);
            initializedRef.current = false;
        } finally {
            setIsProcessing(false);
        }
    };

    // const handleLoginClick = () => {
    //     setIsButtonClick(true);
    //     // ログイン遷移前にフラグを保存
    //     localStorage.setItem("pending_initialization", "true");
    //     signIn("google", { prompt: "select_account" });
    // };

    const handleLoginClick = async () => {
    setIsButtonClick(true);
    localStorage.setItem("pending_initialization", "true");
    
    try {
        const result = await signIn("google", { 
            prompt: "select_account",
            redirect: false // ページリロードを制御するためにfalseを推奨
        });

        // signInがエラーを返した場合（認証キャンセルの場合はresult.errorはnullの可能性あり）
        if (result?.error) {
            throw new Error(result.error);
        }
        
        // redirect: false にした場合、自分でリダイレクトを処理する必要があるため
        // 必要に応じてここに遷移処理を追加するか、デフォルトの挙動に任せます
    } catch (err: any) {
        console.error("Login failed:", err);
        // エラー時は状態をリセット
        setIsButtonClick(false);
        localStorage.removeItem("pending_initialization");
        ToiToiNotification.error("ログインに失敗しました。もう一度お試しください。");
    }
};

    return (
        <div className="flex flex-col min-h-screen bg-[#fdfbf7] text-slate-800 overflow-x-hidden relative">
            <style jsx global>{`
                @keyframes toimaru-constant-walk {
                    0% { transform: translateX(0px) translateY(0px) rotate(0deg); }
                    85% { transform: translateX(-120vw) translateY(0px) rotate(-4deg); }
                    85.01% { transform: translateX(20vw) translateY(0px) rotate(0deg); }
                    100% { transform: translateX(0px) translateY(0px) rotate(0deg); }
                }
                .animate-toimaru-linear { animation: toimaru-constant-walk 22s linear infinite; }
                @keyframes shikiji-peekaboo {
                    0%, 100% { transform: translate(-20px, 20px) rotate(-20deg); opacity: 0.3; }
                    40%, 60% { transform: translate(0px, 0px) rotate(-5deg); opacity: 1; }
                    50% { transform: translate(5px, -5px) rotate(0deg); opacity: 1; }
                }
                .animate-shikiji-special { animation: shikiji-peekaboo 7s ease-in-out infinite; }
                @keyframes hukurou-glide {
                    0%, 100% { transform: translate(0px, 0px) rotate(5deg); }
                    25% { transform: translate(15px, -25px) rotate(12deg); }
                    50% { transform: translate(-10px, -40px) rotate(-3deg); }
                    75% { transform: translate(-20px, -15px) rotate(-10deg); }
                }
                .animate-hukurou-special { animation: hukurou-glide 5.5s ease-in-out infinite; }
            `}</style>

            <main className="flex-grow flex flex-col items-center justify-center px-6 py-24 relative z-10">
                <div className="w-full max-w-md relative mt-16 mb-16">
                    <div className="absolute -top-28 -left-20 w-36 h-36 z-20 pointer-events-none animate-shikiji-special">
                        <Image src="/stamps/shikiji_default.png" alt="シキジ" fill className="object-contain" />
                    </div>
                    <div className="absolute -top-24 -right-16 w-32 h-32 z-20 pointer-events-none animate-hukurou-special">
                        <Image src="/stamps/hukurou_default.png" alt="フクロウ" fill className="object-contain" />
                    </div>
                    
                    <div className="relative z-10 rounded-2xl bg-white p-8 text-center shadow-xl shadow-slate-100 border border-slate-100/80">
                        <div className="mb-8 flex flex-col items-center">
                            <div className="relative w-40 h-14 select-none">
                                <Image src="/logo.png" alt="ToiToi" fill className="object-contain" priority />
                            </div>
                            <p className="mt-4 text-xs text-slate-400 font-medium tracking-wider">チャット・タスク・質問をこれひとつに</p>
                        </div>

                        {isAppBrowser ? (
                            <div className="space-y-6">
                                <div className="rounded-xl bg-amber-50/70 p-4 border border-amber-200/60 text-left">
                                    <p className="text-xs text-amber-700/90 font-medium">LINEやInstagramなどのアプリ内からはGoogleログインがご利用いただけません。</p>
                                </div>
                                <button onClick={handleCopy} className={`w-full py-3.5 rounded-xl font-bold transition-all ${isCopied ? "bg-emerald-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
                                    {isCopied ? "URLをコピーしました！" : "URLをコピーしてブラウザで開く"}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {status === "authenticated" ? (
                                    <button
                                        onClick={initializeUser}
                                        disabled={isProcessing}
                                        className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-slate-100 bg-white py-3.5 px-4 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {isProcessing ? (
                                            <div className="animate-spin h-5 w-5 border-2 border-slate-500 rounded-full border-t-transparent"></div>
                                        ) : (
                                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                                <path
                                                    fill="#35ea96"
                                                    d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.258-3.133C18.334 2.144 15.52 1 12.24 1c-6.076 0-11 4.924-11 11s4.924 11 11 11c6.34 0 10.556-4.43 10.556-10.74 0-.724-.077-1.275-.172-1.685h-10.38z"
                                                />
                                            </svg>
                                        )}
                                        {isProcessing ? "ログイン中..." : "Googleアカウントでログイン"}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleLoginClick}
                                        disabled={status === 'loading'}
                                        className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-slate-100 bg-white py-3.5 px-4 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {status === 'loading' || isButtonClick ? (
                                            <div className="animate-spin h-5 w-5 border-2 border-slate-500 rounded-full border-t-transparent"></div>
                                        ) : (
                                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                                <path
                                                    fill="#35ea96"
                                                    d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.258-3.133C18.334 2.144 15.52 1 12.24 1c-6.076 0-11 4.924-11 11s4.924 11 11 11c6.34 0 10.556-4.43 10.556-10.74 0-.724-.077-1.275-.172-1.685h-10.38z"
                                                />
                                            </svg>
                                        )}
                                        {status === 'loading' || isButtonClick ? "ログイン中..." : "Googleアカウントでログイン"}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <div className="absolute bottom-12 right-20 w-64 h-64 z-0 pointer-events-none animate-toimaru-linear">
                <Image src="/stamps/toimaru_default.png" alt="トイマル" fill className="object-contain" />
            </div>
        </div>
    );
}

export default function TopPage() {
    return (
        <SessionProvider>
            <TopPageContent />
        </SessionProvider>
    );
}