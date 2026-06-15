"use client";
import { useState, useLayoutEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceType: number;
  onSuccess: () => void;
  editingSpace?: { id: string; name: string; favorite: number; space_type?: number; } | null;
}

export default function SpaceModal({ isOpen, onClose, spaceType, onSuccess, editingSpace }: ModalProps) {
  const [name, setName] = useState("");
  const [favorite_flag, setFavoriteFlag] = useState(editingSpace?.favorite || 0);

  useLayoutEffect(() => {
    setName(editingSpace?.name || "");
    setFavoriteFlag(editingSpace?.favorite || 0);
  }, [editingSpace]);

  if (!isOpen) return null;

  // 新規作成か編集かの判定
  const isEdit = !!editingSpace && editingSpace.id !== "new_goal";

  // タイトルマッピング
  const titles = { 1: "チャット", 2: "ToDo", 3: "質問", 99: "目標" };
  const title = titles[spaceType as keyof typeof titles] || "スペース";

  const handleSave = async () => {
    if (!name.trim()) return;

    let url = "";
    let method = "";
    let requestBody = {};

    if (spaceType === 99) {
      // 1. 目標管理専用の通信
      url = "/api/dashboard";
      method = "POST";

      requestBody = {
        content: name,
        // editingSpace の中に status があれば使い、なければ 0 (未達成) にする
        status: editingSpace && "status" in editingSpace ? (editingSpace as any).status : 0
      };
    } else {
      // 2. 通常のスペース（チャット・ToDo・質問）の通信
      url = isEdit ? `/api/spaces/${editingSpace.id}` : "/api/spaces";
      method = isEdit ? "PATCH" : "POST";

      requestBody = isEdit ? {
        name,
        favorite_flag: favorite_flag,
        is_archived: 0
      } : {
        name,
        space_type: spaceType,
        favorite_flag: favorite_flag
      };
    }

    try {
      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        setName("");
        onSuccess();
      }
    } catch (error) {
      console.error("保存に失敗しました", error);
    }
  };

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
        background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
      }}
    >
      <div style={{ width: "440px", background: "white", padding: "25px", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>
        <h2 style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "20px" }}>
          {spaceType === 99 ? (isEdit ? "目標の編集" : "目標の登録") : (isEdit ? `${title}の編集` : `${title}を新規作成`)}
        </h2>

        <input
          type="text"
          placeholder={spaceType === 99 ? "今週の目標を入力" : `${title}の名前`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          style={{ width: "100%", padding: "10px", fontSize: "16px", border: "1px solid #ddd", borderRadius: "6px", marginBottom: "20px" }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginTop: "20px", gap: "10px" }}>

          {/* 目標（99）のときは、お気に入りボタンを表示しない */}
          {spaceType !== 99 && (
            <button
              type="button"
              onClick={() => setFavoriteFlag(favorite_flag === 0 ? 1 : 0)}
              style={{
                flex: 1, height: "40px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "14px",
                background: favorite_flag === 1 ? "#eab308" : "#f4f4f5",
                color: favorite_flag === 1 ? "white" : "#3f3f46",
                border: favorite_flag === 1 ? "none" : "1px solid #e4e4e7",
                transition: "all 0.2s ease"
              }}
            >
              {favorite_flag === 1 ? "★ お気に入り" : "☆ お気に入り"}
            </button>
          )}

          <button type="button" onClick={handleSave} style={{ flex: 1, height: "40px", background: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}>
            保存
          </button>

          <button type="button" onClick={onClose} style={{ flex: 1, height: "40px", background: "#9ca3af", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}