"use client";

import LoginForm from "../features/auth/LoginForm";
import  Header  from "@/components/Header"
import  Footer  from "@/components/Footer"


export default function TopPage() {
  const userId = "123";

  return (
    <>
      <Header/>
        <section id="Login">
        <h1>ToiToi</h1>

        <p>軽くToiToiの説明とかいれれたらな</p>

        {/* ここに実際のログインフォームを表示する */}
        <LoginForm />

        <p>仮のID {userId}</p>
        {/* ここから下は今のままでもOK（あとで整える） */}
        {/* 
        <button 
            onClick={() => router.push(`/setup/${userId}`)}
        >
            ユーザー名登録画面へ
        </button>
        <button 
            onClick={() => router.push('/dashboard')}
        >
            ダッシュボードへ（削除予定）
        </button>
        */}
        </section>
    <Footer/>
    </>
  );
}
