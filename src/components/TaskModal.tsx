import { useState, useEffect } from "react";

type ModalMode = 'create' | 'edit' | 'detail';

export default function TaskModal({ task, onClose, onSuccess, spaceId, mode = 'create' }: any) {

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
        description: task.description || "",
        due_date: task.due_date ? task.due_date.split("T")[0] : "",
        is_allday: task.is_allday || 0,
        priority: task.priority || 1,
        status: task.status || 0,
        tag: task.tag || 1,
      });
    } else {
      setFormData({
        title: "",
        description: "",
        due_date: "",
        is_allday: 0,
        priority: 1,
        status: 0,
        tag: 1,
      });
    }
  }, [task, mode]);

  const isDetailMode = mode === 'detail';
  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  const handleSubmit = async () => {
    if (!formData.title.trim()) return alert("タスク名を入力してください。");
    if (!formData.due_date) return alert("期限を入力してください。");
    if (!formData.description.trim()) return alert("詳細（説明）を入力してください。");

    if (formData.title.length > 20) return alert("タスク名は20文字以内で入力してください。");
    if (formData.description.length > 100) return alert("詳細は100文字以内で入力してください。");

    const safeRegex = /[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF01-\uFF5E]/;
    if (safeRegex.test(formData.title) || safeRegex.test(formData.description)) {
      return alert("タスク名または詳細に記号やスペース（空白）は使用できません。");
    }

    const method = isEditMode ? "PATCH" : "POST";
    const url = isEditMode ? `/api/task/${task.id}` : "/api/task";
    const numericSpaceId = parseInt(spaceId as string);

    if (!numericSpaceId || isNaN(numericSpaceId)) {
      return alert("有効なスペースIDが見つかりません。");
    }

    try {
      const parsedDate = new Date(formData.due_date);
      const isoDueDate = !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : formData.due_date;

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        due_date: isoDueDate,
        space_id: numericSpaceId,
        tag: Number(formData.tag) || 0,
        priority: Number(formData.priority) || 1,
        is_allday: Number(formData.is_allday),
        status: Number(formData.status),
      };

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",   // ← ★これが決定打
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (response.ok) {
        alert(isEditMode ? "タスクを更新しました" : "タスクを登録しました");
        console.log("🔥 POST成功時のレスポンス:", resData); 
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

        <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">
          {isCreateMode && "新規タスク作成"}
          {isEditMode && "タスクを編集"}
          {isDetailMode && "タスク詳細"}
        </h2>        
        <div className="space-y-4">
          {/* タスク名 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">タスク名 (20文字以内・記号不可)</label>
            <input 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
              placeholder="タスク名を入力..." 
              disabled={isDetailMode}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-60"
            />
          </div>

          {/* 詳細入力欄 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">詳細 (100文字以内・記号不可)</label>
            <textarea 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              placeholder="タスクの詳細を入力..." 
              disabled={isDetailMode}
              rows={3}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-60 resize-none"
            />
          </div>

          {/* 期限設定（日付・時間・終日） */}
          <div className="flex flex-col gap-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-500">期限</label>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
                {/* 💡 0 または 1 の数値で checked 判定を制御 */}
                <input 
                  type="checkbox"
                  checked={formData.is_allday === 1}
                  onChange={e => setFormData({...formData, is_allday: e.target.checked ? 1 : 0})}
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
                onChange={e => setFormData({...formData, due_date: e.target.value})} 
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

          {/* 優先度 ＆ タグ */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">優先度</label>
              <select 
                value={formData.priority} 
                onChange={e => setFormData({...formData, priority: Number(e.target.value)})}
                disabled={isDetailMode}
                className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-60"
              >
                <option value={1}>低</option>
                <option value={2}>中</option>
                <option value={3}>高</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">タグ</label>
              <select 
                value={formData.tag} 
                onChange={e => setFormData({...formData, tag: Number(e.target.value)})}
                disabled={isDetailMode}
                className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-60"
              >
                <option value={1}>学習</option>
                <option value={2}>重要</option>
                <option value={3}>プライベート</option>
              </select>
            </div>
          </div>
          
          {/* ステータス */}
          {(isEditMode || isDetailMode) && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">ステータス</label>
              <select 
                value={formData.status} 
                onChange={e => setFormData({...formData, status: Number(e.target.value)})}
                disabled={isDetailMode}
                className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-60"
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