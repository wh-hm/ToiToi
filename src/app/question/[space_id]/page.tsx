"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import toast, { Toaster } from "react-hot-toast";
import { MESSAGES } from "@/constants/messages";
import { useRouter, useParams } from "next/navigation";
import TaskModal from "@/components/TaskModal";
import { Loading } from "@/components/LoadingSpinner";

export default function QuestionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();

  const space_id = params?.space_id;

  // 状態管理
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'detail'>('create');
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);

  // 検索用ステート（仕様：タグ検索 ＆ ナレッジ検索）
  const [searchTag, setSearchTag] = useState<string>("");
  const [searchKnowledge, setSearchKnowledge] = useState<string>("");

   //お祝い演出
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebrationOpacity, setCelebrationOpacity] = useState(false);
  
  // 1. 初期表示・セッション有効チェック
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // 2. 質問サービス：getQuestions の実行
  const fetchQuestions = useCallback(async () => {
    if (!space_id) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/questions?space_id=${space_id}&space_id=${space_id}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("質問データの取得に失敗しました。");
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.questions || []);
      setQuestions(list);
    } catch (error: any) {
      toast.error(error.message || "通信エラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  }, [space_id]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchQuestions();
    }
  }, [status, fetchQuestions]);

  // 3. チェックマーク押下・ステータス更新
  const handleStatusToggle = async (question: any) => {
    const currentStatus = Number(question.is_resolved ?? question.status);
    const newStatus = currentStatus === 1 ? 0 : 1;
    const previousQuestions = [...questions];
    setQuestions(
      questions.map((q) =>
        q.id === question.id
          ? { ...q, status: newStatus, is_resolved: newStatus }
          : q
      )
    );

    try {
      const res = await fetch(`/api/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...question,
          status: newStatus,
          is_resolved: newStatus,
          space_id: Number(space_id),
        }),
      });

      if (res.ok) {
        if (newStatus === 1) {
          triggerCelebration();
        } else {
          toast("未解決に戻しました。");
        }

        const refreshRes = await fetch(`/api/questions?space_id=${space_id}&space_id=${space_id}`);
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          const list = Array.isArray(data) ? data : (data.questions || []);
          setQuestions(list);
        }
      } else {
        toast.error("更新に失敗しました。元に戻します。");
        setQuestions(previousQuestions);
      }
    } catch (error) {
      console.error(error);
      toast.error("通信エラーが発生したため、元に戻します。");
      setQuestions(previousQuestions);
    }
  };

  const triggerCelebration = () => {
    toast.success("質問解決おめでとうございます！", {
      style: {
        border: '2px solid #10B981',
        padding: '16px',
        color: '#065F46',
        fontWeight: 'bold',
        background: '#ECFDF5',
      },
      duration: 4000,
    });
  };

  // 4. 削除処理
  const handleDelete = async (id: number) => {
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <p className="text-sm font-semibold text-slate-800">
          本当にこの質問を削除しますか？
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
              const previousQuestions = [...questions];
              setQuestions(questions.filter((q) => q.id !== id));

              try {
                const res = await fetch(`/api/questions/${id}?space_id=${space_id}`, {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ space_id: Number(space_id) }),
                });
                const data = await res.json();
                if (res.ok) {
                  toast.success(data.message || "削除しました。");
                  const refreshRes = await fetch(`/api/questions?space_id=${space_id}&space_id=${space_id}`);
                  if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    setQuestions(Array.isArray(data) ? data : (data.questions || []));
                  }
                } else {
                  toast.error(MESSAGES.E2004("質問") + " 元に戻します。");
                  setQuestions(previousQuestions);
                }
              } catch (error) {
                console.error(error);
                toast.error("通信エラーが発生したため、元に戻します。");
                setQuestions(previousQuestions);
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

  const handleModalSubmit = async (payload: any) => {
    const isEdit = modalMode === "edit";
    const url = isEdit ? `/api/questions/${selectedQuestion.id}` : `/api/questions`;
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(isEdit ? "質問を更新しました" : "質問を作成しました");
        setIsModalOpen(false);
        fetchQuestions(); // リスト再取得
      } else {
        toast.error(isEdit ? "更新に失敗しました" : "作成に失敗しました");
      }
    } catch (error) {
      toast.error("通信エラーが発生しました");
    }
  };

  // 5. 検索機能 ＆ 解決・未解決の仕分けロジック (useMemoでリアルタイム処理)
  const processedQuestions = useMemo(() => {
    const filtered = questions.filter((q) => {
      const matchTag = searchTag ? String(q.tag) === searchTag : true;
      const matchKnowledge = searchKnowledge
        ? (q.title?.includes(searchKnowledge) ||
          (q.question || q.description || "").includes(searchKnowledge))
        : true;
      return matchTag && matchKnowledge;
    });
    const incomplete = filtered.filter((q) => Number(q.is_resolved ?? q.status) !== 1);
    const complete = filtered.filter((q) => Number(q.is_resolved ?? q.status) === 1);

    return {
      incomplete,
      complete,
      totalFiltered: filtered.length,
      hasOriginalData: questions.length > 0
    };
  }, [questions, searchTag, searchKnowledge]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f8fafc" }}>
        <p>読み込み中...</p>
        <Loading />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 text-slate-800">
      <Toaster position="top-center" />
      {/* ヘッダーエリア */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">質問スペース</h1>
        <button
          onClick={() => { setModalMode('create'); setSelectedQuestion(null); setIsModalOpen(true); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-sm transition-all"
        >
          + 新規質問作成
        </button>
      </div>

      {/* 検索・絞り込みエリア（仕様：タグ検索、ナレッジ検索） */}
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
          className="px-3 pr-10 py-2 bg-white border border-slate-300 rounded-lg text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
          style={{
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 14px center",
            backgroundSize: "16px"
          }}
        >
          <option value="">全件表示</option>
          <option value="1">学習</option>
          <option value="2">重要</option>
          <option value="3">プライベート</option>
          <option value="4">なし</option>
        </select>
      </div>

      {/* データの表示判定 */}
      {!processedQuestions.hasOriginalData ? (
        <div className="text-center py-12 text-slate-400 font-medium">質問がありません</div>
      ) : processedQuestions.totalFiltered === 0 ? (
        <div className="text-center py-12 text-slate-400 font-medium">該当のデータはありません</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* 未解決エリア */}
          <div className="space-y-3">
            <h2 className="font-bold text-red-500 border-b border-red-100 pb-2 flex justify-between items-center">
              <span>未解決</span>
              <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">{processedQuestions.incomplete.length}件</span>
            </h2>
            {processedQuestions.incomplete.map((q) => (
              <div key={q.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex justify-between items-center hover:border-slate-300 transition-all">
                <div
                  className="cursor-pointer flex-1 pr-4"
                  onClick={() => {
                    router.push(`/question/${space_id}/chat/${q.id}`);
                  }}
                >
                  <p className="font-semibold text-slate-900">{q.title}</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => handleStatusToggle(q)}
                    className="w-4 h-4 cursor-pointer rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => { setSelectedQuestion(q); setModalMode('edit'); setIsModalOpen(true); }}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="text-xs font-medium text-red-500 hover:text-red-700"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
            {processedQuestions.incomplete.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">未解決の質問はありません</p>
            )}
          </div>

          {/* 解決済みエリア */}
          <div className="space-y-3">
            <h2 className="font-bold text-green-600 border-b border-green-100 pb-2 flex justify-between items-center">
              <span>解決済み</span>
              <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">{processedQuestions.complete.length}件</span>
            </h2>
            {processedQuestions.complete.map((q) => (
              <div key={q.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center opacity-75 hover:opacity-100 transition-all">
                <div
                  className="cursor-pointer flex-1 pr-4"
                  onClick={() => { setSelectedQuestion(q); setModalMode('detail'); setIsModalOpen(true); }}
                >
                  <p className="font-semibold text-slate-500 line-through">{q.title}</p>
                  <p className="text-xs text-slate-400 mt-1">解決済み</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => handleStatusToggle(q)}
                    className="w-4 h-4 cursor-pointer rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="text-xs font-medium text-red-500 hover:text-red-700"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
            {processedQuestions.complete.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">解決済みの質問はありません</p>
            )}
          </div>

        </div>
      )}

       {/*お祝い演出*/}
        {showCelebration && (
          <div
            className={`fixed inset-0 flex items-center justify-center z-50 pointer-events-none
              transition-all duration-500 ease-out
              ${celebrationOpacity
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-8"
              }
              }`}
          >
            <img
              src="/complete.png"
              alt="お祝い"
              className={`max-w-[90vw] w-full transform transition-all duration-500 scale-100`}
            />
          </div>
        )}

      {/* 5. 共通モーダル*/}
      {isModalOpen && (
        <TaskModal
          task={selectedQuestion}
          mode={modalMode}
          space_id={space_id}
          type="question"
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleModalSubmit}
          onError={(msg: string) => toast.error(msg)}
        />
      )}
    </div>
  );
}