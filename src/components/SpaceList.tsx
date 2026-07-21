"use client";
import { useState, useEffect } from "react";
import { Archive, ArchiveRestore, ArchiveX, Package } from 'lucide-react';

type Space = {
  id: string;
  name: string;
  spaceType: number;
  favoriteFlag: number;
  isArchived: number;
  pendingCount?: string;
};

type SpaceListProps = {
  title: string;
  items: Space[];
  showArchived: number;
  onToggleArchive: (checked: boolean) => void;
  onEdit: (space: Space) => void;
  onDelete: (id: string, spaceType: number) => void;
};

export default function SpaceList(props: SpaceListProps) {
  const { items, title, showArchived, onToggleArchive, onEdit, onDelete } = props;
  const [open, setOpen] = useState(true);
  const [localItems, setLocalItems] = useState<Space[]>(items);
  // const router = useRouter();

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
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid #eee",
                
                // 【追加】アーカイブ済みの時に薄くする
                opacity: s.isArchived === 1 ? 0.5 : 1,
                // 【追加】アーカイブ済みの時に背景を少しグレーにする
                backgroundColor: s.isArchived === 1 ? "#fafafa" : "transparent",
                
                transition: "all 0.2s ease"
              }}
            >
              {/* ★用コンテナ：ここで幅を固定する（これで位置が揃う） */}
              <div style={{ width: "36px", flexShrink: 0, textAlign: "center" }}>
                {s.favoriteFlag === 1 && <span style={{ color: "#eab308" }}>★</span>}
              </div>

                {/* 左側のメインエリア：ここを flex-1 にして、タイトルを省略可能にする */}
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  flex: 1, 
                  minWidth: 0, // これが重要！truncateを効かせるため
                  gap: "8px" 
                }}>

                  {s.isArchived === 1 && (
                      <Package size={18} />
                    )}     
                  <a 
                    href={getLinkPath(s.spaceType, s.id)} 
                    title={s.name}
                    style={{ 
                      textDecoration: "none", 
                      color: "#333", 
                      fontWeight: "500",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "block"
                    }}
                  >
                    {s.name}
                  </a>
                  {/* ラベルやバッジ */}
                  <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                    <span style={{ 
                      fontSize: "13px", 
                      padding: "3px 8px",
                      background: "#f1f5f9", 
                      color: "#475569", 
                      borderRadius: "999px" 
                    }}>
                    {s.pendingCount}
                    </span>
                  </div>
                </div>
                {/* 右側のボタンエリア：ここも縮まないようにする */}
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button onClick={() => onEdit(s)} className="text-sm text-slate-600 hover:text-blue-600 px-2">編集</button>
                  <button onClick={() => onDelete(s.id, s.spaceType)} className="text-sm text-red-600 hover:text-red-800 px-2">削除</button>
                </div>
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