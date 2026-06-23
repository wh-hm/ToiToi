import { useState } from "react";

/// src/components/TaskList.tsx
export default function TaskList({
  tasks,
  toggleComplete,
  onEdit,
  onDelete,
  onDetail // ★追加: 詳細モーダルを開くためのハンドラー
}: any) {

  // 1. 現在どちらのタブを表示するか管理するステート ('incomplete' または 'complete')
  const [activeTab, setActiveTab] = useState<"incomplete" | "complete">("incomplete");

  // 安全策として、データが空の場合の初期値を設定
  const incomplete = tasks?.incomplete || [];
  const complete = tasks?.complete || [];

  // 2. 「データ全体の存在チェック」および「各タブのデータ存在チェック」
  const isAllEmpty = incomplete.length === 0 && complete.length === 0;
  const currentTasks = activeTab === "incomplete" ? incomplete : complete;
  const isCurrentTabEmpty = currentTasks.length === 0;

  return (
    <div className="space-y-6">
      {/* タブ UI */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("incomplete")}
          className={`pb-3 text-sm font-semibold transition-all relative ${activeTab === "incomplete" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-400 hover:text-slate-600"
            }`}
        >
          未完了
          <span className="ml-2 px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">{incomplete.length}</span>
        </button>
        <button
          onClick={() => setActiveTab("complete")}
          className={`pb-3 text-sm font-semibold transition-all relative ${activeTab === "complete" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-400 hover:text-slate-600"
            }`}
        >
          完了
          <span className="ml-2 px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">{complete.length}</span>
        </button>
      </div>

      {/* リストエリア */}
      {isAllEmpty || isCurrentTabEmpty ? (
        <div className="text-center py-12">
          <p className="text-slate-400 text-sm">データがありません</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {currentTasks.map((task: any) => (
            <li
              key={task.id}
              className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* チェックボックス風ボタン */}
                <button
                  onClick={() => toggleComplete(task)}
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${activeTab === "complete"
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-slate-300 hover:border-indigo-500 bg-white"
                    }`}
                >
                  {activeTab === "complete" && <span className="text-xs">✓</span>}
                </button>

                {/* タスク名 */}
                <span
                  onClick={() => onDetail(task)}
                  className={`text-sm font-medium cursor-pointer truncate hover:text-indigo-600 transition-colors ${activeTab === "complete" ? "line-through text-slate-400" : "text-slate-700"
                    }`}
                >
                  {task.title}
                </span>

                {/* 優先度バッジ（例） */}
                {task.priority === 3 && <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md font-semibold">高</span>}
              </div>

              {/* 操作ボタン（マウスホバー時だけクッキリ見せるギミックつき） */}
              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(task)}
                  className="text-xs text-slate-600 hover:bg-slate-200 px-2 py-1.5 rounded-lg transition-colors"
                >
                  編集
                </button>
                <button
                  onClick={() => { if (confirm("本当に削除しますか？")) onDelete(task.id); }}
                  className="text-xs text-rose-600 hover:bg-rose-50 px-2 py-1.5 rounded-lg transition-colors"
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}