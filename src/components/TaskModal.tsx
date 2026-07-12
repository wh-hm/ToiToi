import { useState, useEffect } from "react";

export default function TaskModal(props: any): React.JSX.Element {
  const { task, onClose, onSuccess, spaceId, mode = 'create', type = 'task', onError, onSubmit } = props; 
  
  const getNowDateTime = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
  }

  const getTaskDate = (dateVal: any) => {
    if (!dateVal) return "";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "";
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().slice(0, 10);
    } catch {
      return "";
    }
  };

  const getTaskTime = (dateVal: any) => {
    if (!dateVal) return "";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "";
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().slice(11, 16);
    } catch {
      return "";
    }
  };

  const nowDateTime = getNowDateTime();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: task?.title || "",
    description: task?.question || task?.description || "",
    dueDate: task ? getTaskDate(task.due_date) : nowDateTime.date,
    dueTime: task ? getTaskTime(task.due_date) : nowDateTime.time,
    isAllday: task?.is_allday || 0,
    priority: task?.priority || 1,
    status: task?.status ?? (task?.is_resolved ?? 0),
    tag: task?.tag || 1,
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        description: task.question || task.description || "",
        status: task.status ?? (task.is_resolved ?? 0),
        dueDate: getTaskDate(task.due_date),
        dueTime: getTaskTime(task.due_date),
        isAllday: task.is_allday || 0,
        tag: task.tag || 0,
        priority: task.priority || 1,
      });
    }
  }, [task]);

  const isDetailMode = mode === 'detail';
  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  const showError = (msg: string) => {
    if (onError) onError(msg);
    else alert(msg);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const titleText = formData.title?.trim() || "";
    const descText = formData.description?.trim() || "";
    const itemName = type === "question" ? "質問タイトル" : "タスク名";

    // バリデーション
    if (!titleText) return showError(`${itemName}を入力してください。`);
    if (!descText) return showError("詳細を入力してください。");
    if (titleText.length > 20) return showError(`${itemName}は20文字以内で入力してください。`);
    if (descText.length > 100) return showError("詳細は100文字以内で入力してください。");
    
    const safeRegex = /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF01-\uFF5E]/;
    if (safeRegex.test(titleText.replace(/\s+/g, ''))) return showError(`${itemName}に記号は使用できません。`);
    if (safeRegex.test(descText.replace(/\s+/g, ''))) return showError("詳細に記号は使用できません。");

    if (type === "task" && !formData.dueDate) {
      return showError("期限を入力してください。");
    }

    const d = formData.dueDate || new Date().toISOString().slice(0, 10);
    const t = formData.dueTime || "00:00";
    const parsedDate = new Date(`${d}T${t}:00`);

    if (!parsedDate.getTime() || isNaN(parsedDate.getTime())) {
      return showError("期限の日付または時刻が正しくありません。");
    }

    if (type === "task") {
      const now = new Date();
      const checkDate = new Date(parsedDate.getTime());
      
      // 終日の場合は、その日の終わり（23:59:59）まで許容する
      if (formData.isAllday === 1) {
        checkDate.setHours(23, 59, 59, 999);
      }

      if (checkDate < now) {
        return showError("過去の日時は期限に設定できません。");
      }
    }

    if (!parsedDate.getTime() || isNaN(parsedDate.getTime())) {
      return showError("期限の日付または時刻が正しくありません。");
    }

    const numericSpaceId = parseInt((spaceId ?? props.space_id) as string, 10);
    if (!numericSpaceId || isNaN(numericSpaceId)) {
      return showError("有効なスペースIDが見つかりません。");
    }

    setIsSubmitting(true);

    try {
      const payload = type === "question"
        ? {
          title: titleText,
          question: descText,
          is_resolved: isEditMode ? Number(formData.status) : 0,
          space_id: numericSpaceId,
          tag: Number(formData.tag) || 0,
        }
        : {
          taskId: isEditMode ? task.id : undefined,
          title: titleText,
          spaceId: numericSpaceId,
          tag: Number(formData.tag) || 0,
          priority: Number(formData.priority) || 1,
          isAllday: Number(formData.isAllday),
          status: Number(formData.status),
          description: descText,
          dueDate: parsedDate.toISOString(),
          due_date: parsedDate.toISOString(),
        };

      if (onSubmit) {
        await onSubmit(payload);
        setIsSubmitting(false);
        return;
      }

      const method = isEditMode ? "PATCH" : "POST";
      const baseApiRoute = type === "question" ? "questions" : "task";
      const url = isEditMode ? `/api/${baseApiRoute}/${task.id}` : `/api/${baseApiRoute}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setTimeout(() => onSuccess(Number(formData.status)), 100);
      } else {
        const resData = await res.json();
        showError(resData.message || resData.error || "登録に失敗しました。");
      }
    } catch (error) {
      showError("通信エラーが発生しました。");
    } finally {
      setIsSubmitting(false);
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
                    checked={formData.isAllday === 1}
                    onChange={e => setFormData({ ...formData, isAllday: e.target.checked ? 1 : 0 })}
                    disabled={isDetailMode}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  終日
                </label>
              </div>

              <div className="flex gap-2">
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={e => {
                    setFormData({ ...formData, dueDate: e.target.value });
                  }}
                  disabled={isDetailMode}
                  className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
                <input
                  type="time"
                  value={formData.dueTime}
                  onChange={e => {
                    setFormData({ ...formData, dueTime: e.target.value });
                  }}
                  disabled={isDetailMode || formData.isAllday === 1}
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