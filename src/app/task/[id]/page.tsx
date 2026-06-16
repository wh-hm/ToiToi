"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import TaskList from "@/components/TaskList";
import TaskModal from "@/components/TaskModal";

export default function TaskPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams(); 
  const spaceId = params?.id;

  // 1. 状態管理（State）の設計
  const [rawTasks, setRawTasks] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  // モーダル制御用の拡張
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "detail">("create");

  // タグ検索とソートの状態
  const [searchTag, setSearchTag] = useState<string>("");
  const [sortType, setSortType] = useState<"date" | "priority">("date"); 

  // 2. タスクデータの取得
  const fetchTasks = async () => {
    if (!spaceId) return;
    try {
      const res = await fetch(`/api/task?spaceId=${spaceId}`);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      
      const allTasks = [...(data.incomplete || []), ...(data.complete || [])];
      setRawTasks(allTasks); 
    } catch (error) {
      console.error("タスク取得失敗", error);
    } finally {
      setIsLoading(false); 
    }
  };

  // 統合したセッション・データ取得 useEffect
  useEffect(() => {
    if (status === "loading") return; 
    if (status === "unauthenticated") {
      alert("セッションが無効です。ログイン画面へ遷移します。");
      router.push("/");
      return;
    }
    if (spaceId) {
      fetchTasks();
    }
  }, [spaceId, status, router]);

  // 3. 検索・ソート・完了未完了の分配ロジック
  const processedTasks = useMemo(() => {
    let filtered = rawTasks.filter((task) => {
      if (!searchTag.trim()) return true;
      return String(task.tag).includes(searchTag.trim());
    });

    filtered.sort((a, b) => {
      const dateA = new Date(a.due_date).getTime();
      const dateB = new Date(b.due_date).getTime();
      const prioA = a.priority || 1;
      const prioB = b.priority || 1;

      if (sortType === "date") {
        if (dateA !== dateB) return dateA - dateB;
        return prioB - prioA; 
      } else {
        if (prioA !== prioB) return prioB - prioA; 
        return dateA - dateB; 
      }
    });

    return {
      incomplete: filtered.filter((task) => task.status === 0),
      complete: filtered.filter((task) => task.status === 1),
    };
  }, [rawTasks, searchTag, sortType]);

  // 4. 各種ボタンのアクションハンドラー
  const handleCreateOpen = () => {
    setEditingTask(null);
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleEdit = (task: any) => {
    setEditingTask(task); 
    setModalMode("edit");
    setIsModalOpen(true); 
  };

  const handleDetail = (task: any) => {
    setEditingTask(task);
    setModalMode("detail");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/task/${id}`, { 
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ space_id: spaceId })
      });
      if (res.ok) {
        alert("タスクを削除しました");
        fetchTasks(); 
      } else {
        alert("削除に失敗しました。処理を中断します。");
      }
    } catch (error) {
      alert("削除エラーが発生しました。");
      console.error(error);
    }
  };

  const toggleComplete = async (task: any) => {
    const newStatus = task.status === 0 ? 1 : 0;
    
    try {
      const res = await fetch(`/api/task/${task.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...task, 
          status: newStatus,
          space_id: spaceId
        }),
      });
      
      if (res.ok) {
        alert("ステータスを更新しました");
        if (newStatus === 1) {
          triggerCelebration(); 
        }
        fetchTasks(); 
      } else {
        alert("ステータス更新に失敗しました。チェックマークを元に戻します。");
        fetchTasks();
      }
    } catch (error) {
      alert("通信エラーが発生しました。チェックマークを元に戻します。");
      fetchTasks();
    }
  };

  // お祝い演出（紙吹雪）
  const triggerCelebration = () => {
    console.log("🎉お祝い演出実行！");
  };

  if (isLoading) return <div className="p-6 text-slate-500 text-sm">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* ヘッダーエリア */}
        <header className="flex justify-between items-center border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Task Board</h1>
            <p className="text-sm text-slate-500 mt-1">今日のタスクを整理しましょう</p>
          </div>
          <button 
            onClick={handleCreateOpen} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-xl shadow-sm transition-all text-sm flex items-center gap-1"
          >
            <span>＋</span> 新規作成
          </button>
        </header>

        {/* 検索・ソートコントロールエリア */}
        <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="タグで検索..." 
              value={searchTag} 
              onChange={(e) => setSearchTag(e.target.value)} 
              className="w-full pl-3 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>
          <select 
            value={sortType} 
            onChange={(e) => setSortType(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="date">📅 日付順 (優先度) </option>
            <option value="priority">🔥 優先度順 (日付) </option>
          </select>
        </div>

        {/* メインコンテンツ（リスト） */}
        <main className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <TaskList 
            tasks={processedTasks} 
            toggleComplete={toggleComplete} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
            onDetail={handleDetail} 
          />
        </main>

      </div>

      {/* 共通モーダル */}
      {isModalOpen && (
        <TaskModal
          mode={modalMode} 
          task={editingTask}
          spaceId={spaceId}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchTasks(); 
          }}
        />
      )}
    </div>
  );
}