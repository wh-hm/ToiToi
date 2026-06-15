"use client";

import { useState, useEffect } from "react";

type Space = {
  id: string;
  name: string;
  space_type: number;
  favorite: number;
};

export default function SpaceList(props: any) {
  const { items, title, onEdit, onDelete } = props; // toggleFavorite は使わないので削除
  const [open, setOpen] = useState(true);
  const [localItems, setLocalItems] = useState<Space[]>(items);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const getLinkPath = (type: number, id: string) => {
    switch (type) {
      case 1: return `/chat/${id}`;
      case 2: return `/task/${id}`;
      case 3: return `/question/${id}`;
      default: return `/chat/${id}`;
    }
  };

  return (
    <div style={{ marginBottom: "20px" }}>
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

      {open && (
        <ul style={{ marginTop: "10px" }}>
          {localItems && localItems.length > 0 ? (
            localItems.map((s: Space) => (
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
                <div style={{ width: "36px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
                  {s.favorite === 1 ? (
                    <span
                      style={{
                        fontSize: "18px",
                        color: "#eab308", // 綺麗な黄色
                        userSelect: "none",
                      }}
                    >
                      ★
                    </span>
                  ) : (
                    "" // 0（お気に入りでない）時は何も表示しないが、親のdivが幅をキープするのでズレない
                  )}
                </div>

                <a href={getLinkPath(s.space_type, s.id)} style={{ flexGrow: 1, textDecoration: "none", color: "#333" }}>
                  {s.name}
                </a>

                <button onClick={() => onEdit(s)} style={{ padding: "4px 8px", cursor: "pointer" }}>編集</button>
                <button onClick={() => onDelete(s.id)} style={{ padding: "4px 8px", cursor: "pointer" }}>削除</button>
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