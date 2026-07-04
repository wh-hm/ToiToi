import { useState, useEffect } from "react";

type ModalMode = 'create' | 'edit' | 'detail';

export default function TaskModal({ task, onClose, onSuccess, space_id, mode = 'create', type = 'task' }: any) {

  const [formData, setFormData] = useState({
    title: task?.title || "",
    description: task?.description || "",
    due_date: task?.due_date || "",
    is_allday: task?.is_allday || 0,
    priority: task?.priority || 1,
    status: task?.status || 0,
    tag: task?.tag || 1,
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        description: task.question || task.description || "",
        status: task.status ?? (task.is_resolved ?? 0),
        due_date: task.due_date || "",
        is_allday: task.is_allday || 0,
        tag: task.tag || 0,
        priority: task.priority || 1,
      });
    }
  }, [task]);

  const isDetailMode = mode === 'detail';
  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      return alert(type === "question" ? "質問タイトルを入力してください。" : "タスク名を入力してください。");
    }
    if (type === "task" && !formData.due_date) {
      return alert("期限を入力してください。");
    }

    if (formData.title.length > 20) return alert("タスク名は20文字以内で入力してください。");
    if (formData.description.length > 100) return alert("詳細は100文字以内で入力してください。");

    const safeRegex = /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF01-\uFF5E]/;

    if (safeRegex.test(formData.title)) {
      return alert("タスク名に記号やスペース（空白）は使用できません。");
    }

    if (type === "task" && safeRegex.test(formData.description)) {
      return alert("詳細に記号やスペース（空白）は使用できません。");
    }

    const method = isEditMode ? "PATCH" : "POST";
    const baseApiRoute = type === "question" ? "questions" : "task";

    const url = isEditMode
      ? `/api/${baseApiRoute}/${task.id}`
      : `/api/${baseApiRoute}`;
    const numericspace_id = parseInt(space_id as string);
    if (!numericspace_id || isNaN(numericspace_id)) {
      return alert("有効なスペースIDが見つかりません。");
    }

    try {
      const parsedDate = new Date(formData.due_date);
      const isoDueDate = !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : formData.due_date;
      const payload = type === "question"
        ? {
          title: formData.title.trim(),
          question: formData.description.trim(),
          is_resolved: isEditMode ? Number(formData.status) : 0,
          space_id: numericspace_id,
          tag: Number(formData.tag) || 0,
        }
        : {
          title: formData.title.trim(),
          due_date: isoDueDate,
          space_id: numericspace_id,
          tag: Number(formData.tag) || 0,
          priority: Number(formData.priority) || 1,
          is_allday: Number(formData.is_allday),
          status: Number(formData.status),
          description: formData.description.trim(),
        };

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        alert(`保存失敗: ${resData.error || "リクエストが不正です"}`);
        console.log("POST結果:", resData);
      }
    } catch (error) {
      alert("通信エラーが発生しました。");
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-100 p-6 space-y-5 text-slate-800">

        {/* ヘッダータイトル */}
        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">
          {isCreateMode && (type === "question" ? "新規質問作成" : "新規タスク作成")}
          {isEditMode && (type === "question" ? "質問を編集" : "タスクを編集")}
          {isDetailMode && (type === "question" ? "質問詳細" : "タスク詳細")}
        </h2>

        <div className="space-y-4">
          {/* タイトル入力欄 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">
              {type === "question" ? "質問タイトル" : "タスク名"} (20文字以内・記号不可)
            </label>
            <input
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder={type === "question" ? "質問タイトルを入力..." : "タスク名を入力..."}
              disabled={isDetailMode}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-60"
            />
          </div>

          {/* 詳細入力欄 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">詳細 (100文字以内・記号不可)</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder={type === "question" ? "質問の詳細を入力..." : "タスクの詳細を入力..."}
              disabled={isDetailMode}
              rows={3}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-60 resize-none"
            />
          </div>

          {type !== "question" && (
            <div className="flex flex-col gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-500">期限</label>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_allday === 1}
                    onChange={e => setFormData({ ...formData, is_allday: e.target.checked ? 1 : 0 })}
                    disabled={isDetailMode}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  終日
                </label>
              </div>

              <div className="flex gap-2">
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                  disabled={isDetailMode || (isEditMode && formData.is_allday === 1)}
                  className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
                <input
                  type="time"
                  disabled={isDetailMode || (isCreateMode && formData.is_allday === 1)}
                  className="w-28 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {type !== "question" ? (
            <div className="grid grid-cols-2 gap-3">
              {/* 1. 優先度 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">優先度</label>
                <select
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: Number(e.target.value) })}
                  disabled={isDetailMode}
                  className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-60 appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 14px center",
                    backgroundSize: "16px"
                  }}
                >
                  <option value={1}>高</option>
                  <option value={2}>中</option>
                  <option value={3}>低</option>
                </select>
              </div>

              {/* 2. タグ */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">タグ</label>
                <select
                  value={formData.tag}
                  onChange={e => setFormData({ ...formData, tag: Number(e.target.value) })}
                  disabled={isDetailMode}
                  className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-60 appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 14px center",
                    backgroundSize: "16px"
                  }}
                >
                  <option value={1}>学習</option>
                  <option value={2}>重要</option>
                  <option value={3}>プライベート</option>
                  <option value={4}>なし</option>
                </select>
              </div>
            </div>
          ) : (
            // 2. 質問（question）画面のとき
            <div>
              {!isCreateMode ? (
                <div className="grid grid-cols-2 gap-3">
                  {/* 3. 質問時タグ */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500">タグ</label>
                    <select
                      value={formData.tag}
                      onChange={e => setFormData({ ...formData, tag: Number(e.target.value) })}
                      disabled={isDetailMode}
                      className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-60 appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 14px center",
                        backgroundSize: "16px"
                      }}
                    >
                      <option value={1}>学習</option>
                      <option value={2}>重要</option>
                      <option value={3}>プライベート</option>
                      <option value={4}>なし</option>
                    </select>
                  </div>

                  {/* 4. 質問時ステータス */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500">ステータス</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: Number(e.target.value) })}
                      disabled={isDetailMode}
                      className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-60 appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 14px center",
                        backgroundSize: "16px"
                      }}
                    >
                      <option value={0}>未解決</option>
                      <option value={1}>解決</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {/* 5. 新規作成時タグ */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500">タグ</label>
                    <select
                      value={formData.tag}
                      onChange={e => setFormData({ ...formData, tag: Number(e.target.value) })}
                      disabled={isDetailMode}
                      className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-60 appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 14px center",
                        backgroundSize: "16px"
                      }}
                    >
                      <option value={1}>学習</option>
                      <option value={2}>重要</option>
                      <option value={3}>プライベート</option>
                      <option value={4}>なし</option>
                    </select>
                  </div>
                  <div></div>
                </div>
              )}
            </div>
          )}

          {type !== "question" && (isEditMode || isDetailMode) && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">ステータス</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: Number(e.target.value) })}
                disabled={isDetailMode}
                className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-60 appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 14px center",
                  backgroundSize: "16px"
                }}
              >
                <option value={0}>未完了</option>
                <option value={1}>完了</option>
              </select>
            </div>
          )}
        </div>
        {/* ボタンエリア */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium">
            {isDetailMode ? "閉じる" : "キャンセル"}
          </button>
          {!isDetailMode && (
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-sm"
            >
              {isEditMode ? "更新する" : "作成する"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}