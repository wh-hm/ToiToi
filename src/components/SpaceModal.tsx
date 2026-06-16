"use client";

import { useState, useEffect } from "react";

type SpaceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  spaceType: number;
  onSuccess: () => Promise<void>;
  editingSpace: {
    id: string;
    name: string;
    space_type: number;
    favorite: number;
    is_archived: number;
  } | null;
};

export default function SpaceModal({ isOpen, onClose, spaceType, onSuccess, editingSpace }: SpaceModalProps) {
  const [name, setName] = useState("");
  const [favorite_flag, setFavoriteFlag] = useState(0);
  const [is_archived, setIsArchived] = useState(0); // 🌟 アーカイブ状態を管理するState (0か1)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // モーダルが開いたとき、または編集対象が変わったときに初期値をセット
  useEffect(() => {
    if (isOpen) {
      setName(editingSpace ? editingSpace.name : "");
      setFavoriteFlag(editingSpace ? editingSpace.favorite : 0);
      setIsArchived(editingSpace ? editingSpace.is_archived ?? 0 : 0); // 🌟 既存のアーカイブ状態をセット
    }
  }, [isOpen, editingSpace]);

  if (!isOpen) return null;

  const handleSave = async () => {
    // 目標(99)以外のときは名前の入力チェックを行う
    if (spaceType !== 99 && !name.trim()) {
      alert("名前を入力してください。");
      return;
    }

    setIsSubmitting(true);
    try {
      // 🌟 1. 「目標(99)」の処理か、「スペース(チャット・ToDo・質問)」の処理かをハッキリ分ける
      const isGoal = spaceType === 99;
      
      // 🌟 2. 既存スペースの編集（idが存在する）かどうかを判定
      const isEditingExistingSpace = editingSpace && editingSpace.id !== "new_goal" && editingSpace.id !== "edit_goal";

      // 🌟 3. 正しいURLの割り振り
      let url = "";
      if (isGoal) {
        url = "/api/dashboard"; // 目標ならダッシュボードAPI
      } else if (isEditingExistingSpace) {
        url = `/api/spaces/${editingSpace.id}`; // 既存スペースの編集
      } else {
        url = "/api/spaces"; // 🔥 【ここを修正】通常の新規作成なら /api/spaces に送る！
      }

      // 🌟 4. 正しいデータの形を割り振り
      const bodyData = isGoal
        ? { content: name }
        : { name, space_type: spaceType, favorite_flag, is_archived };

      // 🌟 5. 正しいメソッドの割り振り
      let method = "POST";
      if (isEditingExistingSpace) {
        method = "PATCH"; // 編集なら PATCH (サーバーに合わせて PUT にしてもOK)
      } else {
        method = "POST";  // 新規作成（目標含む）なら POST
      }

      console.log(`通信を開始します: ${method} ${url}`, bodyData); // デバッグ用

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      if (res.ok) {
        await onSuccess();
      } else {
        const errText = await res.text();
        console.error("サーバーからのエラーレスポンス:", errText);
        alert(`保存に失敗しました。Status: ${res.status}`);
      }
    } catch (error) {
      console.error("保存エラー:", error);
      alert("通信エラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  };
  const getTitle = () => {
    if (spaceType === 99) return editingSpace?.id === "new_goal" ? "目標の登録" : "目標の編集";
    const typeNames: Record<number, string> = { 1: "チャット", 2: "ToDo", 3: "質問" };
    return editingSpace ? `${typeNames[spaceType] || "スペース"}の編集` : `${typeNames[spaceType] || "スペース"}の作成`;
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
      <div style={{ background: "white", padding: "30px", borderRadius: "8px", width: "100%", maxWidth: "500px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
        <h2 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "20px" }}>{getTitle()}</h2>

        <input
          type="text"
          placeholder={spaceType === 99 ? "今週の目標を入力" : "名前を入力"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={spaceType === 99 ? 50 : undefined} 
          style={{ width: "100%", padding: "10px", fontSize: "16px", border: "1px solid #ddd", borderRadius: "6px", marginBottom: "20px", boxSizing: "border-box" }}
        />

        {/* ボタン操作エリア */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>

          {/* 目標(99)以外の時だけ、お気に入りとアーカイブボタンを表示 */}
          {spaceType !== 99 && (
            <>
              {/* お気に入りボタン */}
              <button
                type="button"
                onClick={() => setFavoriteFlag(favorite_flag === 0 ? 1 : 0)}
                style={{
                  flex: 1, minWidth: "100px", height: "40px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "14px",
                  background: favorite_flag === 1 ? "#eab308" : "#f4f4f5",
                  color: favorite_flag === 1 ? "white" : "#3f3f46",
                  border: favorite_flag === 1 ? "none" : "1px solid #e4e4e7"
                }}
              >
                {favorite_flag === 1 ? "★ お気に入り" : "☆ お気に入り"}
              </button>

              {/* 追加：アーカイブボタン（数値の0と1で切り替え） */}
              <button
                type="button"
                onClick={() => setIsArchived(is_archived === 0 ? 1 : 0)}
                style={{
                  flex: 1, minWidth: "100px", height: "40px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "14px",
                  background: is_archived === 1 ? "#475569" : "#f4f4f5", 
                  color: is_archived === 1 ? "white" : "#3f3f46",
                  border: is_archived === 1 ? "none" : "1px solid #e4e4e7"
                }}
              >
                {is_archived === 1 ? "アーカイブ済" : "アーカイブする"}
              </button>
            </>
          )}

          {/* 保存・キャンセルボタン */}
          <div style={{ width: "100%", display: "flex", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              style={{ flex: 1, height: "40px", background: "#0070f3", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}
            >
              {isSubmitting ? "保存中..." : "保存"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, height: "40px", background: "#aaa", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}
            >
              キャンセル
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}