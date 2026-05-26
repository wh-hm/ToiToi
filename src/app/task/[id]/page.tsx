"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import TaskList from "@/components/TaskList";
import TaskModal from "@/components/TaskModal";


export default function TaskPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams(); 
  // URLが /task/[id] なら、params.id が spaceId に該当するはず
  const spaceId = params.id;
  const [tasks, setTasks] = useState({ incomplete: [], complete: [] });
  const [isLoading, setIsLoading] = useState(true);
// 修正ポイント：state の初期値を false にする

const [isModalOpen, setIsModalOpen] = useState(false);
const [editingTask, setEditingTask] = useState<any>(null);





const fetchTasks = async () => {
    if (!spaceId) return;
    try {
      const res = await fetch(`/api/task?spaceId=${spaceId}`);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      console.log("フロントが受け取ったデータ:", data); // ★これを見てください！
      setTasks(data); 
    } catch (error) {
      console.error("タスク取得失敗", error);
    } finally {
      // ★ここが絶対に実行されるはず
      setIsLoading(false); 
      console.log("ローディング解除処理完了"); 
    }
};
// ★統合した useEffect
  useEffect(() => {
    if (status === "loading") return; // ロード中は待つ
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    
    // 認証済みならデータを取得
    if (spaceId) {
      fetchTasks();
    }
  }, [spaceId, status, router]); // 必要なものだけ監視

  // 削除処理
const handleDelete = async (id: number) => {
  if (!confirm("本当に削除しますか？")) return;

  try {
    const res = await fetch(`/api/task/${id}`, {
         method: "DELETE",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ space_id: spaceId }) // これを追加！
        });
    if (res.ok) {
      fetchTasks(); // 削除後にリストを再取得して画面を更新
    } else {
      alert("削除に失敗しました");
    }
  } catch (error) {
    console.error("削除エラー:", error);
  }
};


// 編集処理
const handleEdit = (task: any) => {
  // 編集用モーダルを開くためのステート（editingTask などが必要）
  setEditingTask(task); 
  setIsModalOpen(true); // モーダルを表示
};

  

const toggleComplete = async (task: any) => {
  const newStatus = task.status === 0 ? 1 : 0;
  console.log("送信前のタスク:", task);
  await fetch(`/api/task/${task.id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      ...task, 
      status: newStatus,
      space_id: task.space_id // 必要に応じて渡す
    }),
  });
  
  fetchTasks(); // リスト再取得
};

//   if (isLoading) return <div>読み込み中...</div>;

    return (
        <section>
        <h2>ToDoリスト</h2>
        <TaskList 
            tasks={tasks} 
            toggleComplete={toggleComplete} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
            />
        <button>新規作成</button>

        <TaskModal
            task={editingTask}
            spaceId={spaceId} // ★ここから渡す
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => {
            setIsModalOpen(false); // 1. モーダルを閉じる
            fetchTasks();          // 2. 最新のタスク一覧を再取得して表示を更新する
            }}
            />

        </section>
    );
}