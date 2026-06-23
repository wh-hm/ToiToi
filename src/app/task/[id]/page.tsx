"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { MESSAGES } from "@/constants/messages";
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
    const allTasks = [...taskData.incomplete, ...taskData.complete];

    let filtered = allTasks.filter((task) => {
      const matchTag = searchTag ? String(task.tag) === searchTag : true;

      const matchKnowledge = searchKnowledge
        ? (task.title || "").toLowerCase().includes(searchKnowledge.toLowerCase()) ||
        (task.description || "").toLowerCase().includes(searchKnowledge.toLowerCase())
        : true;

      return matchTag && matchKnowledge;
    });

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
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <p className="text-sm font-semibold text-slate-800">
          本当にこのタスクを削除しますか？
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id); 
              const previousTaskData = { ...taskData };
              setTaskData({
                incomplete: taskData.incomplete.filter((t) => t.id !== id),
                complete: taskData.complete.filter((t) => t.id !== id),
              });

              try {
                const res = await fetch(`/api/task/${id}?space_id=${spaceId}`, {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ space_id: Number(spaceId) }),
                });
                if (res.ok) {
                  toast.success(MESSAGES.S1003("タスク"));
                  const refreshRes = await fetch(`/api/task?spaceId=${spaceId}&space_id=${spaceId}`);
                  if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    setTaskData({
                      incomplete: Array.isArray(data.incomplete) ? data.incomplete : [],
                      complete: Array.isArray(data.complete) ? data.complete : [],
                    });
                  }
                } else {
                  toast.error(MESSAGES.E2004("タスク") + " 元に戻します。");
                  setTaskData(previousTaskData); 
                }
              } catch (error) {
                console.error(error);
                toast.error("通信エラーが発生したため、元に戻します。");
                setTaskData(previousTaskData); 
              }
            }}
            className="px-2.5 py-1 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors"
          >
            削除する
          </button>
        </div>
      </div>
    ), {
      duration: Infinity, 
      position: "top-center",
    });
  };

  const toggleComplete = async (task: any) => {
    const newStatus = Number(task.status) === 0 ? 1 : 0;
    const previousTaskData = { ...taskData };
    if (newStatus === 1) {
      // 未完了 ➔ 完了へ移動
      const updatedTask = { ...task, status: 1 };
      setTaskData({
        incomplete: taskData.incomplete.filter((t) => t.id !== task.id),
        complete: [updatedTask, ...taskData.complete],
      });
    } else {
      // 完了 ➔ 未完了へ移動
      const updatedTask = { ...task, status: 0 };
      setTaskData({
        incomplete: [updatedTask, ...taskData.incomplete],
        complete: taskData.complete.filter((t) => t.id !== task.id),
      });
    }

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
        if (newStatus === 1) {
          triggerCelebration(); 
        } else {
          toast("未完了に戻しました");
        }
        // 裏で同期
        const refreshRes = await fetch(`/api/task?spaceId=${spaceId}&space_id=${spaceId}`);
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setTaskData({
            incomplete: Array.isArray(data.incomplete) ? data.incomplete : [],
            complete: Array.isArray(data.complete) ? data.complete : [],
          });
        }
      } else {
        toast.error("更新に失敗しました。元に戻します。");
        setTaskData(previousTaskData); 
      }
    } catch (error) {
      toast.error("通信エラーが発生したため、元に戻します。");
      setTaskData(previousTaskData); 
    }
  };

  const triggerCelebration = () => {
    toast.success("タスク完了！お疲れ様でした！ ", {
      style: {
        border: '2px solid #10B981',
        padding: '16px',
        color: '#065F46',
        fontWeight: 'bold',
        background: '#ECFDF5',
        fontSize: '15px',
      },
      duration: 4000,
    });
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

        {/* 検索・絞り込みエリア */}
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

      {/* 5. 共通モーダル*/}
      {isModalOpen && (
        <TaskModal
          mode={modalMode}
          task={editingTask}
          spaceId={spaceId}
          type="task"
          onClose={() => setIsModalOpen(false)}
          onSuccess={async () => {
            setIsModalOpen(false);
            if (modalMode === "edit") {
              toast.success(MESSAGES.S1002("タスク"));
            } else {
              toast.success(MESSAGES.S1001("タスク"));
            }
            try {
              const res = await fetch(`/api/task?spaceId=${spaceId}&space_id=${spaceId}`);
              if (res.ok) {
                const data = await res.json();
                setTaskData({
                  incomplete: Array.isArray(data.incomplete) ? data.incomplete : [],
                  complete: Array.isArray(data.complete) ? data.complete : [],
                });
              }
            } catch (error) {
              console.error(error);
            }
          }}
        />
      )}
    </div>
  );
}