"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
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
  const [taskData, setTaskData] = useState<{ incomplete: any[]; complete: any[] }>({
    incomplete: [],
    complete: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // モーダル制御用の状態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "detail">("create");

  const [sortType, setSortType] = useState<"date" | "priority">("date");

  // タグ検索とナレッジ検索の状態
  const [searchTag, setSearchTag] = useState<string>("");
  const [searchKnowledge, setSearchKnowledge] = useState<string>("");

  // 2. タスクデータの取得
  const fetchTasks = useCallback(async () => {
    if (!spaceId) return;

    try {
      const res = await fetch(`/api/task?spaceId=${spaceId}&space_id=${spaceId}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      console.log("認証情報を含めた最新データ:", data);

      setTaskData({
        incomplete: Array.isArray(data.incomplete) ? data.incomplete : [],
        complete: Array.isArray(data.complete) ? data.complete : [],
      });
    } catch (error) {
      console.error("タスク取得失敗", error);
    } finally {
      setIsLoading(false);
    }
  }, [spaceId]);

  // セッションチェックと自動フェッチ
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
  }, [spaceId, status, router, fetchTasks]);

  // 3. 検索・ソート・完了未完了の分配ロジック（質問画面ベースの安全版）
  const processedTasks = useMemo(() => {
    // 状態（taskData）からタスクをマージ
    const allTasks = [...taskData.incomplete, ...taskData.complete];

    // 1. 検索（フィルタリング：タグ ＆ ナレッジ）
    let filtered = allTasks.filter((task) => {
      const matchTag = searchTag ? String(task.tag) === searchTag : true;

      const matchKnowledge = searchKnowledge
        ? (task.title || "").toLowerCase().includes(searchKnowledge.toLowerCase()) ||
        (task.description || "").toLowerCase().includes(searchKnowledge.toLowerCase())
        : true;

      return matchTag && matchKnowledge;
    });

    // 2. ソート（安全な日付パース付き）
    filtered.sort((a, b) => {
      const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
      const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
      const prioA = Number(a.priority) || 1;
      const prioB = Number(b.priority) || 1;

      if (sortType === "date") {
        if (dateA !== dateB) return dateA - dateB;
        return prioB - prioA;
      } else {
        if (prioA !== prioB) return prioB - prioA;
        return dateA - dateB;
      }
    });

    // 3. 仕分けて引き渡し
    return {
      incomplete: filtered.filter((task) => Number(task.status) !== 1),
      complete: filtered.filter((task) => Number(task.status) === 1),
    };
  }, [taskData, searchTag, searchKnowledge, sortType]); 

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
    if (!window.confirm("このタスクを削除してもよろしいですか？")) return;
    try {
      const res = await fetch(`/api/task/${id}?space_id=${spaceId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ space_id: Number(spaceId) }),
      });
      if (res.ok) {
        alert("タスクを削除しました");
        fetchTasks();
      } else {
        alert("削除に失敗しました。");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleComplete = async (task: any) => {
    const newStatus = Number(task.status) === 0 ? 1 : 0;
    try {
      const res = await fetch(`/api/task/${task.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...task,
          status: newStatus,
          space_id: Number(spaceId),
        }),
      });

      if (res.ok) {
        if (newStatus === 1) triggerCelebration();
        fetchTasks();
      } else {
        alert("更新に失敗しました。チェックを元に戻します。");
        fetchTasks();
      }
    } catch (error) {
      fetchTasks();
    }
  };

  const triggerCelebration = () => {
    console.log("お祝い演出実行！");
  };

  if (isLoading) return <div className="p-6 text-slate-500 text-sm">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ヘッダーエリア */}
        <header className="flex justify-between items-center border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Task Board</h1>
            <p className="text-sm text-slate-500 mt-1">タスクを整理・管理しましょう</p>
          </div>
          <button
            onClick={handleCreateOpen}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-xl shadow-sm transition-all text-sm flex items-center gap-1"
          >
            <span>＋</span> 新規作成
          </button>
        </header>

        {/*  検索・絞り込みエリア（質問管理と同じ並び、ソート切り替えも選択可能にすると便利です） */}
        <div className="flex gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <input
            type="text"
            placeholder="ナレッジ検索（タイトルや詳細のキーワード）..."
            value={searchKnowledge}
            onChange={(e) => setSearchKnowledge(e.target.value)}
            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={searchTag}
            onChange={(e) => setSearchTag(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">全てのタグ</option>
            <option value="1">学習 / カテゴリ1</option>
            <option value="2">重要 / カテゴリ2</option>
            <option value="3">プライベート / カテゴリ3</option>
          </select>
        </div>

        {/* メインコンテンツ */}
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

      {/* 5. 共通モーダル */}
      {isModalOpen && (
        <TaskModal
          mode={modalMode}
          task={editingTask}
          spaceId={spaceId}
          type="task"
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
