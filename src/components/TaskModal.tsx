import { useState, useEffect } from "react";

// モードの型定義（'create': 新規, 'edit': 編集, 'detail': 詳細）
type ModalMode = 'create' | 'edit' | 'detail';

export default function TaskModal({ task, onClose, onSuccess, spaceId, mode = 'create' }: any) {
  
  // 1. フォームの状態管理（新規項目: is_all_day, priority を追加）
  const [formData, setFormData] = useState({
    title: task?.title || "",
    due_date: task?.due_date || "",
    is_all_day: task?.is_all_day || false, // ★追加: 終日フラグ
    priority: task?.priority || 1,         // ★追加: 優先度 (1:低, 2:中, 3:高 など)
    status: task?.status || 0,
    tag: task?.tag || 1,
  });

  // 2. タスクが変更されたときの初期化処理
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        due_date: task.due_date ? task.due_date.split("T")[0] : "",
        is_all_day: task.is_all_day || false,
        priority: task.priority || 1,
        status: task.status || 0,
        tag: task.tag || 1,
      });
    } else {
      // 新規作成時はフォームをクリア
      setFormData({
        title: "",
        due_date: "",
        is_all_day: false,
        priority: 1,
        status: 0,
        tag: 1,
      });
    }
  }, [task, mode]);

  // 3. 各種判定フラグ（可読性のため）
  const isDetailMode = mode === 'detail';
  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  // 4. 保存・更新処理
  const handleSubmit = async () => {
    // 【単体バリデーションチェック】
    if (!formData.title.trim()) {
      alert("タスク名を入力してください。");
      return;
    }
    if (!formData.due_date) {
      alert("期日を入力してください。");
      return;
    }

    // モードに応じたURLとメソッドの決定
    const method = isEditMode ? "PATCH" : "POST";
    const url = isEditMode ? `/api/task/${task.id}` : "/api/task";
    const numericSpaceId = parseInt(spaceId as string);

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          space_id: numericSpaceId,
        }),
      });

      if (response.ok) {
        alert(isEditMode ? "タスクを更新しました" : "タスクを登録しました");
        onSuccess(); // 親コンポーネント側で再フェッチ等を行う
      } else {
        alert("エラーが発生しました。処理を中断します。");
        console.error("保存失敗");
      }
    } catch (error) {
      alert("通信エラーが発生しました。");
      console.error(error);
    }
  };

  return (
    <div className="modal">
      {/* タイトルの出し分け */}
      <h2>
        {isCreateMode && "新規タスク作成"}
        {isEditMode && "タスクを編集"}
        {isDetailMode && "タスク詳細"}
      </h2>
      
      {/* タスク名: 詳細モードなら非活性 */}
      <input 
        value={formData.title} 
        onChange={e => setFormData({...formData, title: e.target.value})} 
        placeholder="タスク名" 
        disabled={isDetailMode}
      />

      {/* 終日チェックボックス（仕様用に追加） */}
      <label>
        <input 
          type="checkbox"
          checked={formData.is_all_day}
          onChange={e => setFormData({...formData, is_all_day: e.target.checked})}
          disabled={isDetailMode}
        />
        終日
      </label>

      {/* 期日（日付・時間制御の仕様を反映）
          - 新規作成で終日ONの場合 ➔ 時間入力を非活性（※input type="date" の場合は全体制御、またはtime用の枠があるならそこを制御。今回は仕様通り日付部分の disabled を切り替えます）
          - 編集で終日ONの場合 ➔ 日付選択を非活性
      */}
      <input 
        type="date"
        value={formData.due_date} 
        onChange={e => setFormData({...formData, due_date: e.target.value})} 
        disabled={isDetailMode || (isEditMode && formData.is_all_day)} 
      />
      
      {/* 時間選択（仕様：新規作成かつ終日選択時は非活性。詳細モード時も非活性） */}
      <input 
        type="time"
        disabled={isDetailMode || (isCreateMode && formData.is_all_day)}
      />

      {/* 優先度選択（仕様用に追加） */}
      <label>優先度</label>
      <select 
        value={formData.priority} 
        onChange={e => setFormData({...formData, priority: Number(e.target.value)})}
        disabled={isDetailMode}
      >
        <option value={1}>低</option>
        <option value={2}>中</option>
        <option value={3}>高</option>
      </select>

      {/* タグ選択 */}
      <label>タグ</label>
      <select 
        value={formData.tag} 
        onChange={e => setFormData({...formData, tag: Number(e.target.value)})}
        disabled={isDetailMode}
      >
        <option value={1}>タグ1</option>
        <option value={2}>タグ2</option>
        <option value={3}>タグ3</option>
      </select>
      
      {/* ステータス: 編集時のみ表示、詳細時は見せるだけで非活性 */}
      {(isEditMode || isDetailMode) && (
        <select 
          value={formData.status} 
          onChange={e => setFormData({...formData, status: Number(e.target.value)})}
          disabled={isDetailMode}
        >
          <option value={0}>未完了</option>
          <option value={1}>完了</option>
        </select>
      )}

      {/* ボタンエリアの制御: 詳細モードなら保存ボタンは出さない */}
      <div className="modal-actions">
        {!isDetailMode && (
          <button onClick={handleSubmit}>{isEditMode ? "更新" : "作成"}</button>
        )}
        <button onClick={onClose}>{isDetailMode ? "閉じる" : "キャンセル"}</button>
      </div>
    </div>
  );
}