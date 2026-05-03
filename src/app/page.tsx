"use client"
import { useRouter } from "next/navigation"

export default function TopPage(){
    const router = useRouter()
    const userId = "123";
    return(
        <section id="Login">
            <h1>ToiToi</h1>

            <p>軽くToiToiの説明とかいれれたらな</p>
            <button>グーグルでログインのぼたんが入る</button>
            <p>仮のID{userId}</p>
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
        </section>
    )
}