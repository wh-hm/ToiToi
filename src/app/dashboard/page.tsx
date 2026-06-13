"use client";
import { useRouter } from "next/navigation";
import SpaceModal from "@/components/SpaceModal";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import SpaceList from "@/components/SpaceList";

type Space = {
  id: string;
  name: string;
  space_type: number;
  favorite: number;
  is_archived: number;
};

type SpacesState = {
  type1: Space[];
  type2: Space[];
  type3: Space[];
  type1Empty: boolean;
  type2Empty: boolean;
  type3Empty: boolean;
  allEmpty: boolean;
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [spaces, setSpaces] = useState<SpacesState>({
    type1: [], type2: [], type3: [],
    type1Empty: false, type2Empty: false, type3Empty: false, allEmpty: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [modalFavorite, setModalFavorite] = useState<number>(0);

  const [goal, setGoal] = useState<any>(null);
  const [loginInfo, setLoginInfo] = useState<any>(null);
  const [loginMessage, setLoginMessage] = useState("");

  const handleModalFavoriteToggle = () => {
    setModalFavorite(prev => (prev === 1 ? 0 : 1));
  };

  useEffect(() => {
    window.addEventListener("toggle-modal-favorite", handleModalFavoriteToggle);
    return () => window.removeEventListener("toggle-modal-favorite", handleModalFavoriteToggle);
  }, []);

  const openModal = (type: number) => {
    setModalFavorite(0);
    setSelectedType(type);
    setIsModalOpen(true);
  };

  const handleEdit = (space: Space) => {
    setModalFavorite(space.favorite);
    setEditingSpace(space);
    setSelectedType(space.space_type);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, spaceType: number) => {
    if (!confirm("本当に削除しますか？")) return;
    try {
      const res = await fetch(`/api/spaces/${id}?space_type=${spaceType}`, {
        method: "DELETE",
      })
      if (res.ok) {
        await fetchSpaces();
        window.dispatchEvent(new Event("refresh-header"));
      }
    } catch (error) {
      console.error("削除失敗:", error);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  // ------------------------------
  // 🌟 完璧な同期制御を持つ一覧更新処理
  // ------------------------------
  const fetchSpaces = async () => {
    if (!session?.user?.id) return null;
    setIsLoading(true);

    try {
      const res = await fetch("/api/dashboard/");
      if (!res.ok) return null;

      const data = await res.json();
      if (data.goal) setGoal(data.goal);
      if (data.loginInfo) setLoginInfo(data.loginInfo);
      if (data.loginMessage) setLoginMessage(data.loginMessage);

      const targetData = data.spaces || data;

      const convertAndFilter = (list: any[]): Space[] => {
        if (!Array.isArray(list)) return [];
        return list
          .filter((s) => !s.is_archived)
          .map((s) => ({
            id: String(s.id),
            name: String(s.name),
            space_type: Number(s.space_type),
            favorite: Number(s.favorite_flag),
            is_archived: Number(s.is_archived),
          }));
      };

      const sortFavorite = (list: Space[]): Space[] =>
        [...list].sort((a, b) => (a.favorite === b.favorite ? 0 : a.favorite ? -1 : 1));

      const type1 = sortFavorite(convertAndFilter(targetData.type1));
      const type2 = sortFavorite(convertAndFilter(targetData.type2));
      const type3 = sortFavorite(convertAndFilter(targetData.type3));

      const newState = {
        type1, type2, type3,
        type1Empty: type1.length === 0,
        type2Empty: type2.length === 0,
        type3Empty: type3.length === 0,
        allEmpty: type1.length + type2.length + type3.length === 0,
      };

      setSpaces(newState);
      return targetData;
    } catch (error) {
      console.error("取得失敗:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchSpaces();
  }, [status]);

  if (status === "loading") return <div>読み込み中...</div>;

  return (
    <>
      <section style={{ maxWidth: "900px", margin: "40px auto", padding: "30px", background: "white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "20px" }}>ダッシュボード</h1>

        {loginMessage && <div style={{ padding: "15px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "6px", marginBottom: "20px" }}>{loginMessage}</div>}
        {goal && <div style={{ padding: "15px", background: "#fef9c3", border: "1px solid #fde047", borderRadius: "6px", marginBottom: "20px" }}><strong>今日の目標：</strong> {goal.goal_text}</div>}

        <SpaceList
          key={`type1_${spaces.type1.map(s => `${s.id}-${s.favorite}`).join(',')}`}
          title="チャット"
          items={spaces.type1}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        <SpaceList
          key={`type2_${spaces.type2.map(s => `${s.id}-${s.favorite}`).join(',')}`}
          title="ToDoリスト"
          items={spaces.type2}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        <SpaceList
          key={`type3_${spaces.type3.map(s => `${s.id}-${s.favorite}`).join(',')}`}
          title="質問"
          items={spaces.type3}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <div style={{ marginTop: "30px", display: "flex", gap: "12px" }}>
          <button style={{ padding: "10px 20px", background: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }} onClick={() => { setEditingSpace(null); openModal(1); }}>チャット作成</button>
          <button style={{ padding: "10px 20px", background: "#16a34a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }} onClick={() => { setEditingSpace(null); openModal(2); }}>Todo作成</button>
          <button style={{ padding: "10px 20px", background: "#7c3aed", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }} onClick={() => { setEditingSpace(null); openModal(3); }}>質問作成</button>
        </div>
      </section>

      <SpaceModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingSpace(null); }}
        spaceType={selectedType ?? 1}
        onSuccess={async () => {
          // 🌟 モーダル側から保存完了のシグナルが来たら、安全にステートを閉じ、最新データを取得してuseStateを即時更新
          setIsModalOpen(false);
          setEditingSpace(null);
          await fetchSpaces();
          window.dispatchEvent(new Event("refresh-header"));
        }}
        editingSpace={editingSpace}
      />
    </>
  );
}