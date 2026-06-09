"use client"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"; 
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { MESSAGES } from "@/constants/messages"; // メッセージ定数をインポート

export default function Username() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const { data: session, status } = useSession(); 
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // ユーザー名登録
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    const res = await fetch('/api/users/username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        google_id: session?.user?.id,
        username: formData.name
      }),
    });

    const data = await res.json(); // APIからの返答を取得

    if (!res.ok) {
      // APIで設定したエラーメッセージをそのまま表示する！
      toast.error(data.error || MESSAGES.E2002("ユーザー名")); 
      return;
    }
    toast.success(MESSAGES.S1002("ユーザー名"));
    router.push("/dashboard");
  } catch (error) {
    toast.error(MESSAGES.E2002("ユーザー名"));
  }
};
  
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    const checkUsername = async () => {
      if (!session?.user?.id) return;

      try {
        const res = await fetch(`/api/user/username/check`);
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

  if (status === "loading") {
    return <div>読み込み中...</div>;
  }

  return(
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
      </form>
    </section>
  );
}