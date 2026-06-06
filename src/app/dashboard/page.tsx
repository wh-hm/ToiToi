"use client";
import { useRouter } from "next/navigation"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import SpaceModal from "@/components/SpaceModal"
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import SpaceList from "@/components/SpaceList"

export default function Dashboard() {
  const { data: session, status } = useSession(); // セッションの現在の状態を取得
  const router = useRouter();
  const [spaces, setSpaces] = useState({ type1: [], type2: [], type3: [] });
  const [isLoading, setIsLoading] = useState(true);
  // 既存の const の下に追加
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [editingSpace, setEditingSpace] = useState<{ id: string; name: string } | null>(null);

  const [goal, setGoal] = useState(null);
  const [loginInfo, setLoginInfo] = useState(null);
  const [loginMessage, setLoginMessage] = useState("");


  //おきに利
  const handleToggleFavorite = async (id: number) => {
    await fetch(`/api/dashboard/spaces/${id}/favorite`, { method: "PATCH" });
    fetchSpaces(); // 一覧再取得
  };

  // モーダルを開く関数
  const openModal = (type: number) => {
    setSelectedType(type);
    setIsModalOpen(true);
  };
  const handleEdit = (space: any) => {
    setEditingSpace(space); // 編集対象のデータをセット
    setSelectedType(space.space_type);
    setIsModalOpen(true); // モーダルを開く
  };


  const handleDelete = async (id: string) => {
    if (!confirm("本当に削除しますか？")) return;

    try {
      const res = await fetch(`/api/dashboard/spaces/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSpaces(); // 再取得して画面を更新
      }
    } catch (error) {
      console.error("削除失敗:", error);
    }
  };
  useEffect(() => {
    // ステータスが "unauthenticated"（未ログイン）なら強制的にトップへ飛ばす
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const fetchSpaces = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true); // ロード中表示
    try {
      const res = await fetch(`/api/dashboard/?userId=${session.user.id}`);
      const data = await res.json();
      setSpaces(data);
    } catch (error) {
      console.error("データの取得に失敗しました", error);
    } finally {
      setIsLoading(false);
    }
  };
  // ① 関数を先に定義する
  const fetchGoal = async () => {
    try {
      const res = await fetch(`/api/dashboard/goal?userId=${session?.user?.id}`);
      if (!res.ok) throw new Error("目標取得失敗");
      const data = await res.json();
      setGoal(data);
    } catch (error) {
      alert("目標の取得に失敗しました");
    }
  };

  const fetchLoginProfile = async () => {
    try {
      const res = await fetch(`/api/dashboard/login-profile?userId=${session?.user?.id}`);
      if (!res.ok) throw new Error("ログイン情報取得失敗");

      const data = await res.json();
      setLoginInfo(data);

      const hour = new Date().getHours();
      let msg =
        hour < 12 ? "おはようございます！" :
          hour < 18 ? "こんにちは！" :
            "こんばんは！";

      msg += ` ${data.continuousDays}日連続ログイン中！`;

      setLoginMessage(msg);

    } catch (error) {
      alert("ログイン情報の取得に失敗しました");
    }
  };

  // ② その後で useEffect で呼び出す
  useEffect(() => {
    fetchSpaces();
    fetchGoal();
    fetchLoginProfile();
  }, [session]);


  // 読み込み中は何も表示しない、またはローディング画面を出す
  if (status === "loading") {
    return <div>読み込み中...</div>;
  }
  return (
    <>
      <section
        style={{
          maxWidth: "900px",
          margin: "40px auto",
          padding: "30px",
          background: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}
      >
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "20px" }}>
          ダッシュボード
        </h1>

        <SpaceList title="チャット" items={spaces.type1} onEdit={handleEdit} onDelete={handleDelete} toggleFavorite={handleToggleFavorite} />
        <SpaceList title="ToDoリスト" items={spaces.type2} onEdit={handleEdit} onDelete={handleDelete} toggleFavorite={handleToggleFavorite} />
        <SpaceList title="質問" items={spaces.type3} onEdit={handleEdit} onDelete={handleDelete} toggleFavorite={handleToggleFavorite} />

        <div style={{ marginTop: "30px", display: "flex", gap: "12px" }}>
          <button
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
            onClick={() => { setEditingSpace(null); openModal(1); }}
          >
            チャット作成
          </button>

          <button
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              background: "#16a34a",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
            onClick={() => { setEditingSpace(null); openModal(2); }}
          >
            Todo作成
          </button>

          <button
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              background: "#7c3aed",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
            onClick={() => { setEditingSpace(null); openModal(3); }}
          >
            質問作成
          </button>
        </div>

      </section>

      <SpaceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingSpace(null);
        }}
        spaceType={selectedType ?? 1}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchSpaces();
        }}
        editingSpace={editingSpace}
      />

      <Footer />
    </>


  );


}
