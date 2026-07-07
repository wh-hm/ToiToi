"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import toast from "react-hot-toast";
import { MESSAGES } from "@/constants/messages";
import { Loading } from "@/components/LoadingSpinner";
import { fetchWithTimeout } from "@/lib/api";
import { ToiToiNotification } from "@/components/Toast";

type FallingCharacter = {
  id: number;
  src: string;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  isInitial?: boolean;
};

export default function Username() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fallingCharacters, setFallingCharacters] = useState<FallingCharacter[]>([]);
  const { data: session, status } = useSession(); 
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // ユーザー名登録
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. まず今出ているトーストをリセットして連打対策
    toast.dismiss();

    const username = formData.name.trim();
    const invalidCharRegex = /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF01-\uFF5E]/;


    // 2. フロント側バリデーションの3連コンボ
    if (!username) {
      // toast.error(MESSAGES.E1001("ユーザ名"));
      ToiToiNotification.info(MESSAGES.E1001("ユーザ名"))
      return;
    }

    if (username.length > 10) {
      toast.error(MESSAGES.E1002("ユーザ名", 10));
      return;
    }

    if (invalidCharRegex.test(username)) {
      toast.error(MESSAGES.E1003("ユーザ名", "記号"));
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetchWithTimeout('/api/user/username', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }), // トリム済みの綺麗な値を送る
      });

      const data = await res.json();

      if (res.status === 404) {
        router.push('/404')
      }


      if (!res.ok) {
        // 3. API側で弾かれたエラー（重複チェックなど）はここで拾って表示する
        toast.error(data.message); 
        return;
      }
      toast.success(data.message);
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(MESSAGES.E3003);
    } finally {
      setIsSubmitting(false);
    }
  };
  // 認証ステータスの監視
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    const checkUsername = async () => {
      if (!session?.user?.id) return;
      try {
        const res = await fetchWithTimeout(`/api/user/username/check`);

        if (res.status === 404) {
          router.push('/404')
        }

        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data.hasUsername) {
          router.push("/dashboard");
          return;
        }
      } catch (error:any) {
        toast.error(MESSAGES.E3003);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      checkUsername();
    }
  }, [status, session, router]);

  // キャラクターのランダム生成
  useEffect(() => {
    const characterFiles = ["/stamps/hukurou_new.png", "/stamps/toimaru_faces.png", "/stamps/shikiji_faces.png"];
    
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

  return (
    <div className="flex flex-col min-h-screen bg-[#fdfbf7] text-slate-800 overflow-hidden relative">

        <style jsx global>{`
          @keyframes character-fall {
            0% { transform: translateY(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(130vh); opacity: 0; }
          }
          @keyframes character-fall-initial {
            0% { transform: translateY(0); opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(130vh); opacity: 0; }
          }
          .animate-fall { position: absolute; animation-name: character-fall; animation-timing-function: linear; animation-fill-mode: forwards; pointer-events: none; }
          .animate-fall-initial { position: absolute; animation-name: character-fall-initial; animation-timing-function: linear; animation-fill-mode: forwards; pointer-events: none; }
        `}</style>

        {/* ーーー ランダムに降る・最初からいるキャラクターたち ーーー */}
        {fallingCharacters.map((char) => (
          <div
            key={char.id}
            className={`${char.isInitial ? "animate-fall-initial" : "animate-fall"} absolute z-0`} 
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
            <Image src={char.src} alt="falling-character" fill className="object-contain" priority={char.isInitial} />
          </div>
        ))}

        {/* メインコンテンツ（白いカード）：z-index: z-10 でキャラより手前に！ */}
        <main className="flex-grow flex flex-col items-center justify-center px-6 py-24 relative z-10">
            <div className="w-full max-w-md relative mt-16 mb-16">
                <div className="relative rounded-2xl bg-white p-8 text-center shadow-xl shadow-slate-100 border border-slate-100/80">
                    
                    <div className="mb-8 flex flex-col items-center justify-center">
                        <div className="relative w-40 h-14 select-none">
                            <Image src="/logo.png" alt="ToiToi" fill className="object-contain" priority />
                        </div>
                        <h2 className="mt-6 text-base font-bold text-slate-700">プロフィールの設定</h2>
                        <p className="mt-1.5 text-xs text-slate-400 font-medium tracking-wide">ToiToiで利用するあなたの名前を教えてください</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5 text-left">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 tracking-wider">
                              ユーザー名：10文字以内
                            </label>
                            <input 
                                type="text"
                                name="name" 
                                value={formData.name} 
                                onChange={handleChange} 
                                placeholder="例：といとい太郎" 
                                disabled={isSubmitting || loading}
                                className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/50 py-3.5 px-4 text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:bg-white transition-all disabled:opacity-60"
                            />
                        </div>

                        <button 
                          type="submit"
                          disabled={isSubmitting || loading}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-3.5 px-4 text-sm font-bold text-white shadow-sm shadow-blue-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? (
                              <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div>
                          ) : null}
                          {isSubmitting ? "保存中..." : "登録を完了する"}
                      </button>
                    </form>
                    
                </div>
            </div>
        </main>

        {/* 初期読み込み中モーダル：最強の重なり順 z-50 で、カードもキャラもすべてを覆う */}
        {(loading || isSubmitting) && (
          <div className="fixed inset-0 bg-black/5 backdrop-blur-[1px] z-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 max-w-xs w-full text-center">
              <Loading text={loading ? "読み込み中..." : "ユーザー名を登録中..."} />
            </div>
          </div>
        )}

    </div>
  );
}