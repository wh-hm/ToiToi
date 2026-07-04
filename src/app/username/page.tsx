"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import toast from "react-hot-toast";
import { MESSAGES } from "@/constants/messages";

// 降ってくるキャラクターの型定義
type FallingCharacter = {
  id: number;
  src: string;
  left: number; // 横位置 (%)
  top: number;  // 初期配置用 (px または %)
  size: number; // サイズ (px)
  duration: number; // アニメーション時間 (s)
  delay: number; // 遅延 (s)
  isInitial?: boolean; // 最初から配置されているかどうかのフラグ
};

export default function Username() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fallingCharacters, setFallingCharacters] = useState<FallingCharacter[]>([]);
  const { data: session, status } = useSession(); 
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // ユーザー名登録
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("ユーザー名を入力してください。");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // ※ もしこれでも404になる場合は、バックエンドのフォルダが /api/user/route.ts になっている可能性があります
      const res = await fetch('/api/user/username', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.name
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || `エラー (${res.status}): 登録できませんでした。APIのパスを確認してください。`); 
        return;
      }
      toast.success(MESSAGES.S1002("ユーザー名"));
      router.push("/dashboard");
    } catch (error) {
      toast.error(MESSAGES.E2002("ユーザー名"));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 認証ステータスの監視と既存ユーザー名チェック
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    const checkUsername = async () => {
      if (!session?.user?.id) return;

      try {
        const res = await fetch(`/api/user/username/check`);
        
        // if (res.status === 404) {
        //   return; // まだ名前がない状態を許容
        // }

        if (!res.ok) throw new Error();
        
        const data = await res.json();
        if (data.hasUsername) {
          router.push("/dashboard");
        }
      } catch (error) {
        toast.error(MESSAGES.E2003("ユーザー名"));
      }
    };

    if (status === "authenticated") {
      checkUsername();
    }
  }, [status, session, router]);

  // キャラクターのランダム生成
  useEffect(() => {
    const characterFiles = ["/stamps/hukurou_new.png", "/stamps/toimaru_faces.png", "/stamps/shikiji_faces.png"];
    
    // 1. 最初から画面内に配置するキャラクターをたくさん生成 (15匹)
    const initialCharacters: FallingCharacter[] = Array.from({ length: 15 }).map((_, index) => {
      return {
        id: Date.now() + Math.random() + index,
        src: characterFiles[Math.floor(Math.random() * characterFiles.length)],
        left: Math.random() * 85,
        top: Math.random() * 85, 
        size: Math.random() * (190 - 140) + 140, 
        duration: Math.random() * (10 - 7) + 7,
        delay: 0,
        isInitial: true
      };
    });

    setFallingCharacters(initialCharacters);

    // 2. 定期的に上から降ってくるキャラクターを追加 (600ms間隔)
    const intervalId = setInterval(() => {
      setFallingCharacters((prev) => {
        if (prev.length > 45) return prev;

        const newCharacter: FallingCharacter = {
          id: Date.now() + Math.random(),
          src: characterFiles[Math.floor(Math.random() * characterFiles.length)],
          left: Math.random() * 85,
          top: -220,
          size: Math.random() * (190 - 140) + 140,
          duration: Math.random() * (9 - 6) + 6,
          delay: 0,
          isInitial: false
        };
        return [...prev, newCharacter];
      });
    }, 600);

    return () => clearInterval(intervalId);
  }, []);

  const handleAnimationEnd = (id: number) => {
    setFallingCharacters((prev) => prev.filter(char => char.id !== id));
  };

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fdfbf7]">
        <div className="animate-spin h-8 w-8 border-4 border-[#2563eb] rounded-full border-t-transparent"></div>
        <p className="mt-4 text-sm font-medium text-slate-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#fdfbf7] text-slate-800 overflow-hidden relative">
        
        {/* 🛠️ アニメーションCSS */}
        <style jsx global>{`
          @keyframes character-fall {
            0% {
              transform: translateY(0);
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            90% {
              opacity: 1;
            }
            100% {
              transform: translateY(130vh);
              opacity: 0;
            }
          }

          @keyframes character-fall-initial {
            0% {
              transform: translateY(0);
              opacity: 1;
            }
            90% {
              opacity: 1;
            }
            100% {
              transform: translateY(130vh);
              opacity: 0;
            }
          }

          .animate-fall {
            position: absolute;
            animation-name: character-fall;
            animation-timing-function: linear;
            animation-fill-mode: forwards;
            pointer-events: none;
          }

          .animate-fall-initial {
            position: absolute;
            animation-name: character-fall-initial;
            animation-timing-function: linear;
            animation-fill-mode: forwards;
            pointer-events: none;
          }
        `}</style>

        {/* ーーー ランダムに降る・最初からいるキャラクターたち ーーー */}
        {fallingCharacters.map((char) => (
          <div
            key={char.id}
            className={char.isInitial ? "animate-fall-initial" : "animate-fall"}
            style={{
              left: `${char.left}%`,
              top: char.isInitial ? `${char.top}vh` : `${char.top}px`,
              width: `${char.size}px`,
              height: `${char.size}px`,
              animationDuration: `${char.duration}s`,
              animationDelay: `${char.delay}s`,
            }}
            onAnimationEnd={() => handleAnimationEnd(char.id)}
          >
            <Image 
              src={char.src} 
              alt="falling-character" 
              fill 
              className="object-contain"
              priority={char.isInitial} // ★ LCP警告対策：初期配置の画像のみ最優先で読み込む
            />
          </div>
        ))}
        {/* ーーーーーーーーーーーーーーーーーーーーー */}

        {/* メインコンテンツ */}
        <main className="flex-grow flex flex-col items-center justify-center px-6 py-24 relative z-10">
            
            <div className="w-full max-w-md relative mt-16 mb-16">
                
                {/* メインの入力カード */}
                <div className="relative z-10 rounded-2xl bg-white p-8 text-center shadow-xl shadow-slate-100 border border-slate-100/80">
                    
                    {/* ヘッダーエリア */}
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
                        <h2 className="mt-6 text-base font-bold text-slate-700">
                          プロフィールの設定
                        </h2>
                        <p className="mt-1.5 text-xs text-slate-400 font-medium tracking-wide">
                          ToiToiで利用するあなたの名前を教えてください
                        </p>
                    </div>

                    {/* 入力フォーム */}
                    <form onSubmit={handleSubmit} className="space-y-5 text-left">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wider">
                                ユーザー名
                            </label>
                            <input 
                                type="text"
                                name="name" 
                                value={formData.name} 
                                onChange={handleChange} 
                                placeholder="例：といとい太郎" 
                                maxLength={20}
                                disabled={isSubmitting}
                                className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 py-3.5 px-4 text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:bg-white transition-all disabled:opacity-60"
                            />
                        </div>

                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-3.5 px-4 text-sm font-bold text-white shadow-sm shadow-blue-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div>
                            ) : null}
                            {isSubmitting ? "登録しています..." : "登録を完了する"}
                        </button>
                    </form>
                    
                </div>
            </div>
        </main>

    </div>
  );
}