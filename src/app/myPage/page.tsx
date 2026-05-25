"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

export default function MyPage() {
  const router = useRouter();

  // 1. リクエスト処理関数
  const handleRequest = async (action: string, method: string = "POST", data: any = null) => {
    if (method !== "PATCH" && !confirm(`${action}を実行しますか？`)) return;

    const options: RequestInit = {
      method: method,
      headers: { "Content-Type": "application/json" },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const res = await fetch(`/api/myPage/${action}`, options);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "処理に失敗しました");
      }

      alert(result.message);

      // 2. 成功後の遷移処理
      if (action === "delete/account") {
        // アカウント削除ならセッションを破棄してログインへ
        await signOut({ callbackUrl: "/" });
      } else if (action === "user/logout") {
        await signOut({ callbackUrl: "/" });
      } else {
        // その他の操作なら画面更新
        router.refresh();
      }
    } catch (error: any) {
      alert("エラー: " + error.message);
    }
  };

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px", maxWidth: "300px" }}>
      <h2>マイページ設定</h2>
      
      <input type="text" placeholder="新しいユーザー名" id="newNameInput" />
      <button onClick={() => {
        const input = document.getElementById("newNameInput") as HTMLInputElement;
        handleRequest("user/changeUsername", "PATCH", { newName: input.value });
      }}>
        ユーザー名変更
      </button>

      <hr style={{ width: "100%" }} />

      <button onClick={() => handleRequest("delete/task", "DELETE")}>ToDo全削除</button>
      <button onClick={() => handleRequest("delete/chat", "DELETE")}>チャット全削除</button>
      <button onClick={() => handleRequest("delete/question", "DELETE")}>質問全削除</button>
      <button onClick={() => handleRequest("delete/space", "DELETE")}>スペース全削除</button>
      <button onClick={() => handleRequest("delete/account", "DELETE")}>アカウント削除</button>
      <button onClick={() => handleRequest("user/logout", "POST")}>ログアウト</button>
    </div>
  );
}