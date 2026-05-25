"use client"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"; 
import { useSession } from "next-auth/react";


export default function Username() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession(); // セッションの現在の状態を取得
  const router = useRouter();

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  //ユーザ名登録
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const res = await fetch('/api/username/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      google_id: session?.user?.id, // セッションからIDを自動取得
      username: formData.name       // 入力された名前
    }),
  });

  
  const data = await res.json();
    if (!res.ok) {
      setError(data.error); // ここにメッセージが表示される！
      return;
    }
    // 成功時、ダッシュボードへ
    router.push("/dashboard");
    
  };


  
  useEffect(() => {
    // 1. 未ログインならトップへ
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    // 2. ログイン済みなら、すでにユーザー名があるかチェック
    const checkUsername = async () => {
      if (!session?.user?.id) return;

      try {
        const res = await fetch(`/api/username/exists?googleId=${session.user.id}`);
        const data = await res.json();
        
        // ユーザー名がすでにあるならダッシュボードへ飛ばす
        if (data.hasUsername) {
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("チェック失敗", error);
      }
    };

    if (status === "authenticated") {
      checkUsername();
    }
  }, [status, session, router]);
  // 読み込み中は何も表示しない、またはローディング画面を出す
  if (status === "loading") {
    return <div>読み込み中...</div>;
  }

  return(
    <>
      <section>
        <div>ユーザ名変更よ</div>
        <form onSubmit={handleSubmit}>
        <input 
          name="name" 
          value={formData.name} 
          onChange={handleChange} 
          placeholder="ユーザー名を入力" 
        />
        <button type="submit">保存する</button>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </form>
      </section>
    </>
  );
}
