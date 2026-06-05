"use client";

import { useState } from "react";

export default function SpaceList(props: any) {
  const { items, title, onEdit, onDelete, toggleFavorite } = props;
  const [open, setOpen] = useState(true); // ← 最初は開いた状態にする

  const getLinkPath = (type: number, id: string | number) => {
    switch (type) {
      case 1: return `/chat/${id}`;
      case 2: return `/task/${id}`;
      case 3: return `/question/${id}`;
      default: return `/chat/${id}`;
    }
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      
      {/* ▼ タイトル行（UIはシンプルなまま） */}
      <h2
        onClick={() => setOpen(!open)}
        style={{
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#f3f3f3",
          padding: "10px",
          borderRadius: "4px",
          border: "1px solid #ddd",
        }}
      >
        {title}
        <span>{open ? "▲" : "▼"}</span>
      </h2>

      {/* ▼ 開閉部分（元のUIそのまま） */}
      {open && (
        <ul style={{ marginTop: "10px" }}>
          {items && items.length > 0 ? (
            items.map((s: any) => (
              <li
                key={s.id}
                style={{
                  display: "flex",
                  gap: "10px",
                  padding: "8px",
                  borderBottom: "1px solid #eee",
                  alignItems: "center",
                }}
              >
                {/* お気に入り */}
                <button onClick={() => toggleFavorite(s.id)}>
                  {s.favorite_flag === 1 ? "★" : "☆"}
                </button>

                {/* 名前リンク */}
                <a href={getLinkPath(s.space_type, s.id)}>{s.name}</a>

                {/* 編集・削除 */}
                <button onClick={() => onEdit(s)}>編集</button>
                <button onClick={() => onDelete(s.id)}>削除</button>
              </li>
            ))
          ) : (
            <p>データなし</p>
          )}
        </ul>
      )}
    </div>
  );
}
