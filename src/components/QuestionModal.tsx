import { useState, useEffect } from "react";

// initialData を追加し、onSave に id を含めるように変更
export default function QuestionModal({ 
  onSave, 
  initialData, 
  onClose 
}: { 
  onSave: (title: string, detail: string, tag: number, id?: number) => void,
  initialData?: any,
  onClose: () => void 
}) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");

  // initialData が変わるたびにフォームを更新する
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDetail(initialData.question);
    } else {
      setTitle("");
      setDetail("");
    }
  }, [initialData]);

  return (
    <div style={{ padding: "20px", border: "1px solid #ccc", background: "#f9f9f9" }}>
      <h3>{initialData ? "質問編集" : "質問作成"}</h3>
      
      <input 
        placeholder="質問タイトル" 
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ display: "block", marginBottom: "10px", width: "100%" }}
      />
      <textarea 
        placeholder="質問詳細" 
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        style={{ display: "block", marginBottom: "10px", width: "100%" }}
      />
      
      <button onClick={() => {
        onSave(title, detail, 1, initialData?.id);
        onClose();
      }}>
        {initialData ? "更新する" : "作成する"}
      </button>
      <button onClick={onClose} style={{ marginLeft: "10px" }}>キャンセル</button>
    </div>
  );
}
