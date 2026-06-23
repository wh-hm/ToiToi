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
  const [is_archived, setIsArchived] = useState(0); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  // モーダルが開いたとき、または編集対象が変わったときに初期値をセット
  useEffect(() => {
    if (isOpen) {
      setName(editingSpace ? editingSpace.name : "");
      setFavoriteFlag(editingSpace ? editingSpace.favorite : 0);
      setIsArchived(editingSpace ? editingSpace.is_archived ?? 0 : 0); 
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
      const isGoal = spaceType === 99;
      
      const isEditingExistingSpace = editingSpace && editingSpace.id !== "new_goal" && editingSpace.id !== "edit_goal";

      let url = "";
      if (isGoal) {
        url = "/api/dashboard"; 
      } else if (isEditingExistingSpace) {
        url = `/api/spaces/${editingSpace.id}`; 
      } else {
        url = "/api/spaces"; 
      }

      const bodyData = isGoal
        ? { content: name }
        : { name, space_type: spaceType, favorite_flag, is_archived };

      let method = "POST";
      if (isEditingExistingSpace) {
        method = "PATCH"; 
      } else {
        method = "POST";  
      }

      console.log(`通信を開始します: ${method} ${url}`, bodyData); 

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
    <div style={{
      position: "fixed",
      top: 0, left: 0, width: "100%", height: "100%",
      backgroundColor: "rgba(15, 23, 42, 0.3)", 
      backdropFilter: "blur(6px)",            
      display: "flex", justifyContent: "center", alignItems: "center",
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: "#ffffff",
        padding: "24px 28px",
        borderRadius: "14px", 
        width: "100%",
        maxWidth: "460px",    
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.03)"
      }}>
        
        {/* 【1. ヘッダー】 */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "19px", fontWeight: "700", color: "#0f172a", letterSpacing: "-0.025em" }}>
            {spaceType === 99 ? "目標の管理" : editingSpace?.id ? "スペースの編集" : "新規スペース作成"}
          </h3>
        </div>

        {/* 【2. 入力エリア】お気に入りの星を入力欄の中に埋め込む */}
        <div style={{ marginBottom: "24px", position: "relative", display: "flex", alignItems: "center" }}>
          <input
            type="text"
            value={name} // 🌟 Stateの「name」をバインドする
            onChange={(e) => setName(e.target.value)} // 🌟 入力時にStateを更新する
            placeholder="名前を入力"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 44px 12px 14px", 
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "15px",
              color: "#334155",
              outline: "none",
              background: "#f8fafc",
              transition: "border-color 0.2s",
            }}
          />
          
          {/* 入力欄の右端に浮かぶ星マーク */}
          {spaceType !== 99 && (
            <button
              type="button"
              onClick={() => setFavoriteFlag(favorite_flag === 0 ? 1 : 0)}
              style={{
                position: "absolute",
                right: "12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "20px",
                color: favorite_flag === 1 ? "#eab308" : "#94a3b8",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.1s ease"
              }}
              title="お気に入り"
              onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.85)"}
              onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              {favorite_flag === 1 ? "★" : "☆"}
            </button>
          )}
        </div>

        {/* 【3. ボトムアクションエリア】すべてを1行に綺麗に集約 */}
        <div style={{
          display: "flex",
          justifyContent: "flex-end", 
          alignItems: "center",
          borderTop: "1px solid #f1f5f9",
          paddingTop: "16px",
          gap: "8px"
        }}>
          {spaceType !== 99 && (
            <button
              type="button"
              onClick={() => setIsArchived(is_archived === 0 ? 1 : 0)}
              style={{
                marginRight: "auto", 
                padding: "0 20px", 
                height: "38px", 
                borderRadius: "6px", 
                cursor: "pointer", 
                fontWeight: "bold", 
                fontSize: "13px",
                transition: "all 0.2s ease",
                background: is_archived === 1 ? "#e2e8f0" : "#ffffff", 
                color: is_archived === 1 ? "#334155" : "#475569",
                border: is_archived === 1 ? "1px solid #cbd5e1" : "1px solid #e4e4e7"
              }}
            >
              {is_archived === 1 ? "アーカイブ済" : "アーカイブ"}
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            style={{
              padding: "0 18px",
              height: "38px",
              background: isSubmitting ? "#60a5fa" : "#2563eb", 
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
              boxShadow: "0 1px 2px rgba(37, 99, 235, 0.2)"
            }}
          >
            {isSubmitting ? "保存中..." : "保存する"}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "0 16px",
              height: "38px",
              background: "#ffffff",
              color: "#64748b",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "14px",
              transition: "background 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#ffffff"}
          >
            キャンセル
          </button>
        </div>

      </div>
    </div>
  );
}