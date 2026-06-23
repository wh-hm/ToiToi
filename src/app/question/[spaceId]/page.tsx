"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { MESSAGES } from "@/constants/messages";
import { useRouter, useParams } from "next/navigation";
import TaskModal from "@/components/TaskModal";

export default function QuestionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();

  const spaceId = params?.spaceId;

  // 状態管理
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'detail'>('create');
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);

  // 検索用ステート（仕様：タグ検索 ＆ ナレッジ検索）
  const [searchTag, setSearchTag] = useState<string>("");
  const [searchKnowledge, setSearchKnowledge] = useState<string>("");

  // 1. 初期表示・セッション有効チェック
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // 2. 質問サービス：getQuestions の実行
  const fetchQuestions = useCallback(async () => {
    if (!spaceId) return;
    try {
      setIsLoading(true);

      const res = await fetch(`/api/questions?spaceId=${spaceId}&space_id=${spaceId}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("質問データの取得に失敗しました。");

      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.questions || []);
      setQuestions(list);
    } catch (error: any) {
      alert(error.message || "通信エラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchQuestions();
    }
  }, [status, fetchQuestions]);

  // 3. チェックマーク押下・ステータス更新 (updateQuestionStatus)
  const handleStatusToggle = async (question: any) => {
    // 0: 未解決 / 1: 解決
    const newStatus = question.status === 1 ? 0 : 1;

    try {
      const res = await fetch(`/api/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          spaceId: spaceId
        }),
      });

      if (!res.ok) throw new Error("ステータスの更新に失敗しました。");

      if (newStatus === 1) {
        alert("🎉 質問解決おめでとうございます！お祝い演出 🎉");
      } else {
        alert("ステータスを未解決に戻しました。");
      }

      fetchQuestions();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("この質問を削除してもよろしいですか？")) return;

    try {
      const res = await fetch(`/api/questions/${id}?space_id=${spaceId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        toast.success(MESSAGES.S1003("質問"));
        fetchQuestions(); // 一覧の再取得関数
      } else {
        toast.error(MESSAGES.E2004("質問"));
      }
    } catch (error) {
      console.error(error);
      toast.error(MESSAGES.E2004("質問"));
    }
  };

  // 5. 検索機能 ＆ 解決・未解決の仕分けロジック (useMemoでリアルタイム処理)
  const processedQuestions = useMemo(() => {
    // 表示されているデータから「タグ」と「ナレッジ」で絞り込み
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

  if (status === "loading" || isLoading) {
    return <div className="p-8 text-center text-slate-500 font-medium">質問スペースを読み込み中...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 text-slate-800">
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
          className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">全てのタグ</option>
          <option value="1">学習 / カテゴリ1</option>
          <option value="2">重要 / カテゴリ2</option>
          <option value="3">プライベート / カテゴリ3</option>
        </select>
      </div>

      {/* データの表示判定 */}
      {!processedQuestions.hasOriginalData ? (
        // 仕様：元々のデータがそもそも空の場合
        <div className="text-center py-12 text-slate-400 font-medium">データがありません</div>
      ) : processedQuestions.totalFiltered === 0 ? (
        // 仕様：検索によって該当データがなくなった場合
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
                {/* 仕様：データクリック時・直接質問チャット画面に遷移する */}
                <div
                  className="cursor-pointer flex-1 pr-4"
                  onClick={() => {
                    router.push(`/question/${spaceId}/chat/${q.id}`);
                  }}
                >
                  <p className="font-semibold text-slate-900">{q.title}</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* 仕様：チェックマーク押下で解決へ移動 */}
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => handleStatusToggle(q)}
                    className="w-4 h-4 cursor-pointer rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  {/* 仕様：編集ボタン押下 */}
                  <button
                    onClick={() => { setSelectedQuestion(q); setModalMode('edit'); setIsModalOpen(true); }}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    編集
                  </button>
                  {/* 仕様：削除ボタン押下 */}
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
                {/* 詳細表示 */}
                <div
                  className="cursor-pointer flex-1 pr-4"
                  onClick={() => { setSelectedQuestion(q); setModalMode('detail'); setIsModalOpen(true); }}
                >
                  <p className="font-semibold text-slate-500 line-through">{q.title}</p>
                  <p className="text-xs text-slate-400 mt-1">解決済み</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* チェックを外して未解決に戻す */}
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

      {isModalOpen && (
        <TaskModal
          task={selectedQuestion}
          mode={modalMode}
          spaceId={spaceId}
          type="question"
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => { 
            if (modalMode === "edit") {
              toast.success(MESSAGES.S1002("質問")); 
            } else {
              toast.success(MESSAGES.S1001("質問"));
            }
            
            setIsModalOpen(false); 
            fetchQuestions(); 
          }}
        />
      )}
    </div>
  );
}