"use client";
import { useRouter } from "next/navigation"
import  Header  from "@/components/Header"
import  Footer  from "@/components/Footer"
import  SpaceModal  from "@/components/SpaceModal"
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
      const res = await fetch(`/api/dashboard/spaces?userId=${session.user.id}`);
      const data = await res.json();
      setSpaces(data);
    } catch (error) {
      console.error("データの取得に失敗しました", error);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchSpaces();
  }, [session]);

    // 読み込み中は何も表示しない、またはローディング画面を出す
    if (status === "loading") {
      return <div>読み込み中...</div>;
    }
  return (
    <>
      <Header />
      <section>
        <div>ダッシュボード</div>

        <SpaceList title="チャット" items={spaces.type1} onEdit={handleEdit} onDelete={handleDelete} toggleFavorite={handleToggleFavorite}/>
        <SpaceList title="ToDoリスト" items={spaces.type2} onEdit={handleEdit} onDelete={handleDelete} toggleFavorite={handleToggleFavorite}/>
        <SpaceList title="質問" items={spaces.type3} onEdit={handleEdit} onDelete={handleDelete} toggleFavorite={handleToggleFavorite}/>

        <button onClick={() => { setEditingSpace(null); openModal(1); }}>チャット作成</button>
        <button onClick={() => { setEditingSpace(null); openModal(2); }}>Todo作成</button>
        <button onClick={() => { setEditingSpace(null); openModal(3); }}>質問作成</button>
      </section>
      
      <SpaceModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false)
          setEditingSpace(null);
        }}
        spaceType={selectedType ?? 1}
        onSuccess={() => {
          setIsModalOpen(false); // モーダルを閉じる
          fetchSpaces();         // ★データを再取得して画面を更新！
        }}
        editingSpace={editingSpace}
      />
      <Footer />
    </>
  );

}
