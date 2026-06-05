"use client";
import { useState, useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceType: number;
  onSuccess: () => void;
  editingSpace?: { id: string; name: string } | null;
}

export default function SpaceModal({ isOpen, onClose, spaceType, onSuccess, editingSpace }: ModalProps) {
  const [name, setName] = useState("");

  // editingSpace が変わるたびに（編集モードの切り替え）入力値をセットする
  useEffect(() => {
    console.log("編集対象が変わりました:", editingSpace);
    setName(editingSpace?.name || "");
  }, [editingSpace]);

  if (!isOpen) return null;

  const titles = { 1: "チャット", 2: "ToDo", 3: "質問" };
  const title = titles[spaceType as keyof typeof titles];

  const handleSave = async () => {
    if (!name.trim()) return;

    const url = editingSpace ? `/api/dashboard/spaces/${editingSpace.id}` : "/api/dashboard/spaces/create";
    const method = editingSpace ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          space_type: spaceType,
        }),
      });

      if (res.ok) {
        setName("");
        onSuccess(); // Dashboard側の再読み込みを発火
      }
    } catch (error) {
      console.error("保存に失敗しました", error);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000
      }}
    >
      <div
        style={{
          width: "400px",
          background: "white",
          padding: "25px",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)"
        }}
      >
        <h2
          style={{
            fontSize: "22px",
            fontWeight: "bold",
            marginBottom: "20px"
          }}
        >
          {editingSpace ? `${title}の編集` : `${title}を新規作成`}
        </h2>

        <input
          type="text"
          placeholder={`${title}の名前`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            fontSize: "16px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            marginBottom: "20px"
          }}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            onClick={handleSave}
            style={{
              padding: "10px 20px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            保存
          </button>

          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              background: "#aaa",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}