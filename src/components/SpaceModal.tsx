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

    const url = editingSpace ? `/api/spaces/${editingSpace.id}` : "/api/spaces";
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
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{editingSpace ? `${title}の編集` : `${title}を新規作成`}</h2>
        <input
          type="text"
          placeholder={`${title}の名前`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={handleSave}>保存</button>
        <button onClick={onClose}>キャンセル</button>
      </div>
    </div>
  );
}