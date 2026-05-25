import { useState, useEffect } from "react";

export default function TaskModal({ task, onClose, onSuccess, spaceId }: any) {
  // task があればその値、なければ初期値を入れる
  const [formData, setFormData] = useState({
    title: task?.title || "",
    due_date: task?.due_date || "",
    status: task?.status || 0,
    tag: task?.tag || 1, // 初期値はタグ1にしておきます
  });

  // ★重要：task が変わるたびにフォームを更新する
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        due_date: task.due_date ? task.due_date.split("T")[0] : "", // 日付形式を修正
        status: task.status || 0,
        tag: task.tag || 1,
      });
    }
  }, [task]);


const [tasks, setTasks] = useState({ incomplete: [], complete: [] });
  const handleSubmit = async () => {
  const method = task ? "PATCH" : "POST";
  const url = task ? `/api/task/${task.id}` : "/api/task";
  const numericSpaceId = parseInt(spaceId as string);
  const response = await fetch(url, {
    method: method,
    headers: {
      "Content-Type": "application/json", // これがないとサーバーがデータを読み込めません
    },
    body: JSON.stringify({
      ...formData,
      space_id: numericSpaceId, // ここに本物のspaceIdを入れる
    }),
  });

  if (response.ok) {
    onSuccess();
  } else {
    console.error("保存失敗");
  }
};



  return (
    <div className="modal">
      <h2>{task ? "タスクを編集" : "新規タスク作成"}</h2>
      
      {/* タスク名 */}
      <input 
        value={formData.title} 
        onChange={e => setFormData({...formData, title: e.target.value})} 
        placeholder="タスク名" 
      />

      {/* 期日 */}
      <input 
        type="date"
        value={formData.due_date} 
        onChange={e => setFormData({...formData, due_date: e.target.value})} 
      />

      {/* タグ選択 */}
      <select 
        value={formData.tag} 
        onChange={e => setFormData({...formData, tag: Number(e.target.value)})}
      >
        <option value={1}>タグ1</option>
        <option value={2}>タグ2</option>
        <option value={3}>タグ3</option>
      </select>
      
      {/* 編集時のみ状態(status)を変更 */}
      {task && (
        <select value={formData.status} onChange={e => setFormData({...formData, status: Number(e.target.value)})}>
          <option value={0}>未完了</option>
          <option value={1}>完了</option>
        </select>
      )}

      <button onClick={handleSubmit}>{task ? "更新" : "作成"}</button>
      <button onClick={onClose}>キャンセル</button>
    </div>
  );
}