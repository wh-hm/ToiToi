// src/app/chat/[id]/page.tsx
'use client';
import { useState, useEffect } from "react";
import ChatInput from "@/components/ChatInput";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const [inputText, setInputText] = useState("");
  const [space_id, setSpaceId] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
const [editValue, setEditValue] = useState("");


  const handleSendStamp = async (stampUrl: string) => {
    const { id } = await params;
    
    const payload = {
      content: stampUrl, // スタンプURLを送信
      type: "stamp",     // ★これを追加
    };

    await fetch(`/api/chat/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };
  const handleUploadImage = async (file: File) => {
    const { id } = await params; // ここでも await が必要
    try {
      const formData = new FormData();
      formData.append("file", file);

      // パスにも id を使う
      const res = await fetch(`/api/chat/${id}/upload`, {
        method: "POST",
        body: formData,
      });
      // ...以下略
    } catch (error) {
      console.error("画像送信エラー:", error);
    }
  };

 const handleSend = async () => {
    const { id } = await params;
    
    // サーバー側の route.ts に合わせる
    const payload = {
      content: inputText, // サーバー側の content に入る
      type: "text",       // ★重要：これがないとサーバー側で type === 'text' が判定できない！
    };

    try {
      const response = await fetch(`/api/chat/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setInputText("");
      }
      fetchMessages();
    } catch (error) {
      console.error("送信失敗:", error);
    }
  };

  const [messages, setMessages] = useState([]);

  // メッセージの取得処理
  const fetchMessages = async () => {
    const { id } = await params;
    const res = await fetch(`/api/chat/${id}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
    setSpaceId(data[0].space_id); // データがある場合のみセット
  }
    setMessages(data);
  };

  
//編集
  const handleEditClick = async (chatId: number) => {
  try {
      const response = await fetch(`/api/chat/${chatId}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          { space_id: space_id,
            message: editValue,
           }),
      });

      if (response.ok) {
        setInputText("");
      }
      fetchMessages();
    } catch (error) {
      console.error("送信失敗:", error);
    }
};

//削除
const handleDeleteClick = async (chatId: number) => { // id ではなくわかりやすく chatId に
  if (!confirm("本当に削除しますか？")) return;

  try {
      // 1. URLには「チャットのID」を入れる
      // 2. Bodyには「チャットを特定するために必要な情報（space_id）」を入れる
      const response = await fetch(`/api/chat/${chatId}/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ space_id: space_id }), // オブジェクト形式で送る
      });

      if (response.ok) {
        fetchMessages();
      } else {
        const errorData = await response.json();
        alert(`削除失敗: ${errorData.error}`);
      }
    } catch (error) {
      console.error("送信失敗:", error);
    }
}

const handleToggleFavorite = async (chatId: number, currentFlag: number) => {
  try {
    const response = await fetch(`/api/chat/${chatId}/favorite`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        favorite_flag: currentFlag === 1 ? 0 : 1, // 反転した値を送信
        space_id: space_id 
      }),
    });

    if (response.ok) {
      fetchMessages(); // 再読み込み
    }
  } catch (error) {
    console.error("お気に入り更新失敗:", error);
  }
};

const changeBackground = async (chatId: number, background: number) => {
  try {
    const response = await fetch(`/api/chat/${chatId}/background`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        background: background, 
        space_id: space_id // ここが正しい値か確認ポイント
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log("成功:", result);
      fetchMessages(); // 再取得
    } else {
      console.error("失敗:", result);
      alert(`失敗: ${result.error}`);
    }
  } catch (error) {
    console.error("通信エラー:", error);
  }
};

// ページ読み込み時に実行
  useEffect(() => {
    fetchMessages();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* メッセージリストの表示エリア */}
        <div>
      {/* メッセージ一覧の表示 */}
      {messages.map((msg: any) => (
        <div key={msg.id}>
          <p>{msg.message}</p>
          {/* --- ★ここを追加（お気に入りボタン）--- */}
    <button onClick={() => handleToggleFavorite(msg.id, msg.favorite_flag)}>
      {msg.favorite_flag === 1 ? "★" : "☆"}
    </button>
          <input 
            placeholder={msg.message}
            onChange={(e) => setEditValue(e.target.value)} 
          />

          {/* テスト用の赤と青のボタン */}
          <button 
            onClick={() => changeBackground(msg.id, 1)} // 1にするボタン
            style={{ backgroundColor: "red", color: "white", marginRight: "5px" }}
          >
            赤
          </button>
          <button 
            onClick={() => changeBackground(msg.id, 2)} // 0にするボタン
            style={{ backgroundColor: "blue", color: "white" }}
          >
            青
          </button>
          {/* 編集ボタン：msg.id を関数に渡す */}
          <button onClick={() => handleEditClick(msg.id)}>編集</button>
          
          {/* 削除ボタン：msg.id を関数に渡す */}
          <button onClick={() => handleDeleteClick(msg.id)}>削除</button>
              </div>
            ))}
        </div>
      </div>

      <ChatInput 
      value={inputText} 
      onChange={setInputText} 
      onSend={handleSend} 
      onSendStamp={handleSendStamp} // ★これが必要です！
      onUploadImage={handleUploadImage} // ★これらも忘れずに
    />
    </div>
  );
}