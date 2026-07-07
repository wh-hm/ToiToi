"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Space = {
  id: string;
  name: string;
  space_type: number;
  favorite: number;
  is_archived: number;
};

type SpaceListProps = {
  title: string;
  items: Space[];
  showArchived: number;
  onToggleArchive: (checked: boolean) => void;
  onEdit: (space: Space) => void;
  onDelete: (id: string, spaceType: number) => void;
  onCheckError: (message: string) => void;
};

export default function SpaceList(props: SpaceListProps) {
  const { items, title, showArchived, onToggleArchive, onEdit, onDelete, onCheckError } = props;
  const [open, setOpen] = useState(true);
  const [localItems, setLocalItems] = useState<Space[]>(items);
  const router = useRouter();

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
  const handleSpaceClick = async (e: React.MouseEvent, type: number, id: string) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/spaces/${id}?space_type=${type}`, { method: "GET" });

      if (res.status === 404 || !res.ok) {
        onCheckError("このスペースは既に削除されています。");
        router.push("/404");
      } else {
        router.push(getLinkPath(type, id));
      }
    } catch (error) {
      console.error("生存チェック失敗:", error);
      onCheckError("通信エラーが発生しました。");
    }
  };
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f3f3f3", padding: "10px", borderRadius: "4px", border: "1px solid #ddd" }}>

        {/* タイトル開閉エリア */}
        <h2
          onClick={() => setOpen(!open)}
          style={{
            cursor: "pointer",
            margin: 0,
            fontSize: "18px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            userSelect: "none",
            flexGrow: 1
          }}
        >
          <span style={{
            display: "inline-block",
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "6px solid #1e293b",
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.2s ease",
            transformOrigin: "center 3px"
          }}></span>

          {title}
        </h2>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", userSelect: "none", paddingLeft: "15px" }}>
          <input
            type="checkbox"
            id={`archiveToggle-${title}`}
            checked={showArchived === 1}
            onChange={(e) => onToggleArchive(e.target.checked)}
            style={{ width: "15px", height: "15px", cursor: "pointer" }}
          />
          <label htmlFor={`archiveToggle-${title}`} style={{ fontSize: "12px", color: "#475569", fontWeight: "bold", cursor: "pointer" }}>
            アーカイブを表示
          </label>
        </div>
      </div>

      {open && (
        <ul style={{ marginTop: "10px", paddingLeft: "0", listStyle: "none" }}>
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
                  opacity: s.is_archived === 1 ? 0.5 : 1,
                  background: s.is_archived === 1 ? "#fafafa" : "transparent",
                  transition: "all 0.2s ease"
                }}
              >
                {/* ★マークエリア */}
                <div style={{ width: "36px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
                  {s.favorite === 1 ? (
                    <span
                      style={{
                        fontSize: "18px",
                        color: "#eab308",
                        userSelect: "none",
                      }}
                    >
                      ★
                    </span>
                  ) : (
                    ""
                  )}
                </div>

                {/* リンクとテキストエリア */}
                <div style={{ flexGrow: 1, display: "flex", alignItems: "center", gap: "8px" }}>
                  <a
                    href={getLinkPath(s.space_type, s.id)}
                    style={{
                      textDecoration: "none",
                      color: "#333",
                      fontWeight: "500"
                    }}
                  >
                    {s.name}
                  </a>

                  {s.is_archived === 1 && (
                    <span
                      style={{
                        padding: "2px 6px",
                        background: "#cbd5e1",
                        color: "#475569",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: "bold",
                        userSelect: "none"
                      }}
                    >
                      アーカイブ済
                    </span>
                  )}
                </div>

                {/* 操作ボタン */}
                <button onClick={() => onEdit(s)} style={{ padding: "4px 8px", cursor: "pointer" }}>編集</button>
                <button onClick={() => onDelete(s.id, s.space_type)} style={{ padding: "4px 8px", cursor: "pointer" }}>削除</button>
              </li>
            ))
          ) : (
            <p style={{ padding: "10px", color: "#666" }}>データなし</p>
          )}
        </ul>
      )}
    </div>
  );

}