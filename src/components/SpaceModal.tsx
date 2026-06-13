"use client";
import { useState, useEffect,useLayoutEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceType: number;
  onSuccess: () => void;
  editingSpace?: { id: string; name: string; favorite: number; } | null;
}

export default function SpaceModal({ isOpen, onClose, spaceType, onSuccess, editingSpace }: ModalProps) {
  const [name, setName] = useState("");
  const [favorite_flag, setFavoriteFlag] = useState(editingSpace?.favorite || 0);

  useLayoutEffect(() => {
    setName(editingSpace?.name || "");
    setFavoriteFlag(editingSpace?.favorite || 0);
  }, [editingSpace]);

  if (!isOpen) return null;

  const titles = { 1: "チャット", 2: "ToDo", 3: "質問" };
  const title = titles[spaceType as keyof typeof titles];

  const handleSave = async () => {
    if (!name.trim()) return;

    // 1. 新規作成か編集かで、URLとメソッド、送信するデータを完全に切り分ける
    const isEdit = !!editingSpace;
    const url = isEdit ? `/api/spaces/${editingSpace.id}` : "/api/spaces";
    const method = isEdit ? "PATCH" : "POST";

    // 送信するオブジェクトの初期化
    let requestBody = {};

    if (isEdit) {
      // 🌟 編集モード：name, favorite_flag, is_archived を送る
      requestBody = {
        name,
        favorite_flag: favorite_flag, // true なら 1、false(無い時) なら 0
        is_archived: 0        // 編集時はアーカイブしないため false 固定
      };
    } else {
      // 🌟 新規作成モード：name と space_type を送る
      requestBody = {
        name,
        space_type: spaceType,
        favorite_flag: favorite_flag
      };
    }

    try {
      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody), // 組み立てたデータをシリアライズして送信
      });

      if (res.ok) {
        setName("");
        onSuccess(); // Dashboard側の再読み込み処理へ
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
          {editingSpace ? `${title}の編集` : `${title}を新規作成`}
        </h2>

        <input
          type="text"
          placeholder={`${title}の名前`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: "100%", padding: "10px", fontSize: "16px", border: "1px solid #ddd", borderRadius: "6px", marginBottom: "20px" }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginTop: "20px", gap: "10px" }}>
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