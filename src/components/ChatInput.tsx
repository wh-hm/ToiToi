// src/components/ChatInput.tsx
import { useState, useRef } from "react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSendStamp: (stampId: string) => void;
  onUploadImage: (file: File) => void;
}

export default function ChatInput({ value, onChange, onSend, onSendStamp, onUploadImage }: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stamps = ["😊", "👍", "🎉", "🔥"];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadImage(e.target.files[0]);
    }
  };

  return (
    <div style={{ borderTop: "1px solid #ccc", padding: "16px", backgroundColor: "#fff" }}>
      {/* スタンプ選択エリア */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        {stamps.map((stamp) => (
          <button key={stamp} onClick={() => onSendStamp(stamp)} style={{ fontSize: "1.2rem" }}>
            {stamp}
          </button>
        ))}
      </div>

      {/* 入力エリア */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {/* ファイル選択（隠し） */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          style={{ display: "none" }} 
          accept="image/*" 
        />
        <button onClick={() => fileInputRef.current?.click()}>+</button>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="メッセージを入力..."
          style={{ flex: 1, padding: "8px" }}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
        />

        <button onClick={onSend} disabled={!value.trim()}>↑</button>
      </div>
    </div>
  );
}