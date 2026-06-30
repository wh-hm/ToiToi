"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn, SessionProvider } from "next-auth/react";
import Image from "next/image";

function TopPageContent() {
    const router = useRouter();
    const [isAppBrowser, setIsAppBrowser] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isPending, startTransition] = useTransition();

    // 1. アプリ内ブラウザの判定
    useEffect(() => {
        const ua = window.navigator.userAgent.toLowerCase();
        const patterns = ["line", "fbav", "fb_iab", "instagram", "twitter", "tiktok", "wv", "messenger", "snapchat"];
        const isEmbedded = patterns.some((pattern) => ua.includes(pattern));
        setIsAppBrowser(isEmbedded);
    }, []);

    // 2. ログインボタンを押した時の処理
    const handleGoogleLogin = () => {
        startTransition(async () => {
            // NextAuthのサインインを実行
            // ※ログイン後の遷移先や新規登録チェックのロジックに合わせて callbackUrl を調整してください
            await signIn("google", { 
                callbackUrl: "/dashboard" 
            }, { 
                prompt: "select_account" 
            });
            
            router.refresh();
        });
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 3000);
        } catch (err) {
            alert("URLのコピーに失敗しました。");
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#fdfbf7] text-slate-800 overflow-x-hidden relative">
            
            {/* 🛠️ 演出カスタマイズ：各キャラクターのアニメーション設定 */}
            <style jsx global>{`
                /* 1. といまる：右側から画面左端まで「完全に一定のスピード（等速）」で歩き、右へループする */
                @keyframes toimaru-constant-walk {
                    0% { 
                        transform: translateX(0px) translateY(0px) rotate(0deg); 
                    }
                    85% { 
                        transform: translateX(-120vw) translateY(0px) rotate(-4deg); 
                    }
                    85.01% { 
                        transform: translateX(20vw) translateY(0px) rotate(0deg); 
                    }
                    100% { 
                        transform: translateX(0px) translateY(0px) rotate(0deg); 
                    }
                }
                .animate-toimaru-linear {
                    animation: toimaru-constant-walk 22s linear infinite;
                }

                /* 2. シキジ：カードの左上でひょっこり覗き見 */
                @keyframes shikiji-peekaboo {
                    0%, 100% { transform: translate(-20px, 20px) rotate(-20deg); opacity: 0.3; }
                    40%, 60% { transform: translate(0px, 0px) rotate(-5deg); opacity: 1; }
                    50% { transform: translate(5px, -5px) rotate(0deg); opacity: 1; }
                }
                .animate-shikiji-special {
                    animation: shikiji-peekaboo 7s ease-in-out infinite;
                }

                /* 3. フクロウ：カードの右上で優雅に∞(インフィニティ)軌道を描いて飛行 */
                @keyframes hukurou-glide {
                    0%, 100% { transform: translate(0px, 0px) rotate(5deg); }
                    25% { transform: translate(15px, -25px) rotate(12deg); }
                    50% { transform: translate(-10px, -40px) rotate(-3deg); }
                    75% { transform: translate(-20px, -15px) rotate(-10deg); }
                }
                .animate-hukurou-special {
                    animation: hukurou-glide 5.5s ease-in-out infinite;
                }
            `}</style>

            {/* メインコンテンツ */}
            <main className="flex-grow flex flex-col items-center justify-center px-6 py-24 relative z-10">
                
                {/* キャラクターとカードを包むコンテナ */}
                <div className="w-full max-w-md relative mt-16 mb-16">
                    
                    {/* ーーー まわりの飾りキャラクターたち ーーー */}
                    
                    {/* 左上：シキジちゃん（大きめサイズ ＆ 覗き見モーション） */}
                    <div className="absolute -top-28 -left-20 w-36 h-36 z-20 pointer-events-none animate-shikiji-special">
                        <Image 
                            src="/stamps/shikiji_default.png" 
                            alt="シキジ" 
                            fill 
                            className="object-contain" 
                        />
                    </div>

                    {/* 右上：フクロウちゃん（大きめサイズ ＆ 8の字優雅飛行モーション） */}
                    <div className="absolute -top-24 -right-16 w-32 h-32 z-20 pointer-events-none animate-hukurou-special">
                        <Image 
                            src="/stamps/hukurou_default.png" 
                            alt="フクロウ" 
                            fill 
                            className="object-contain" 
                        />
                    </div>
                    
                    {/* ーーーーーーーーーーーーーーーーーーーーー */}

                    {/* メインのログインカード */}
                    <div className="relative z-10 rounded-2xl bg-white p-8 text-center shadow-xl shadow-slate-100 border border-slate-100/80">
                        
                        {/* ロゴ画像を表示するエリア */}
                        <div className="mb-8 flex flex-col items-center justify-center">
                            <div className="relative w-40 h-14 select-none">
                                <Image
                                    src="/logo.png"
                                    alt="ToiToi"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <p className="mt-4 text-xs text-slate-400 font-medium tracking-wider">
                                チャット・タスク・質問をこれひとつに
                            </p>
                        </div>

                        {isAppBrowser ? (
                            /* アプリ内ブラウザ用UI */
                            <div className="space-y-6">
                                <div className="rounded-xl bg-amber-50/70 p-4 border border-amber-200/60 text-left">
                                    <div className="flex items-center gap-2 mb-1.5 text-amber-800 font-bold text-sm">
                                        <svg className="h-5 w-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        アプリ内ブラウザ制限
                                    </div>
                                    <p className="text-xs text-amber-700/90 leading-relaxed font-medium">
                                        LINEやInstagramなどのアプリ内からはGoogleログインがご利用いただけません。
                                    </p>
                                </div>

                                <button
                                    onClick={handleCopy}
                                    className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 px-4 text-sm font-bold transition-all shadow-sm active:scale-[0.98] ${
                                        isCopied 
                                        ? "bg-emerald-500 text-white shadow-emerald-100" 
                                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100"
                                    }`}
                                >
                                    {isCopied ? (
                                        <>
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                            URLをコピーしました！
                                        </>
                                    ) : (
                                        <>
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376A8.965 8.965 0 0012 12.75c-.497 0-.982.04-1.455.12l-.104.022m.733 4.361a8.854 8.854 0 005.45-3.414m0 0A8.983 8.983 0 0121 12a8.982 8.982 0 01-3.32-6.884M18 12c0-.339-.02-.673-.06-1m-4.94 4.94a4.12 4.12 0 000-5.88" />
                                            </svg>
                                            URLをコピーしてブラウザで開く
                                        </>
                                    )}
                                </button>
                                <p className="text-[11px] text-slate-400 font-medium">
                                    コピー後、SafariやChromeなどの標準ブラウザに貼り付けてログインしてください。
                                </p>
                            </div>
                        ) : (
                            /* 通常のログインUI */
                            <div className="space-y-4">
                                <button
                                    onClick={handleGoogleLogin}
                                    disabled={isPending}
                                    className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-slate-100 bg-white py-3.5 px-4 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isPending ? (
                                        <div className="animate-spin h-5 w-5 border-2 border-slate-500 rounded-full border-t-transparent"></div>
                                    ) : (
                                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                                            <path
                                                fill="#35ea96"
                                                d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.258-3.133C18.334 2.144 15.52 1 12.24 1c-6.076 0-11 4.924-11 11s4.924 11 11 11c6.34 0 10.556-4.43 10.556-10.74 0-.724-.077-1.275-.172-1.685h-10.38z"
                                            />
                                        </svg>
                                    )}
                                    {isPending ? "ログイン中..." : "Googleアカウントでログイン"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* 【画面最下部：等速でお散歩】といまるくん */}
            <div className="absolute bottom-12 right-20 w-64 h-64 z-0 pointer-events-none animate-toimaru-linear">
                <Image 
                    src="/stamps/toimaru_default.png" 
                    alt="トイマル" 
                    fill 
                    className="object-contain" 
                />
            </div>

            {/* フッター */}
            <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-100 bg-white relative z-20">
                © 2026 ToiToi
            </footer>
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