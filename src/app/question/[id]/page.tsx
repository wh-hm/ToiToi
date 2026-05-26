"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import TaskList from "@/components/TaskList";
import QuestionModal from "@/components/QuestionModal";


export default function Question() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams(); 
  // URLが /task/[id] なら、params.id が spaceId に該当するはず
  const spaceId = params.id;

  // ★統合した useEffect
  useEffect(() => {
    if (status === "loading") return; // ロード中は待つ
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    
    // 認証済みならデータを取得
    if (spaceId) {
      getQuestions();
    }
  }, [spaceId, status, router]); // 必要なものだけ監視

  const [questions, setQuestions] = useState([]);
  // 毎回計算して、TaskListに渡すデータを作る
  const taskData = {
    incomplete: questions.filter((q: any) => q.is_resolved === 0),
    complete: questions.filter((q: any) => q.is_resolved === 1),
  };

const getQuestions = async () => {
  try {
    // APIのGETメソッドを叩く (spaceIdをクエリパラメータで渡す)
    const res = await fetch(`/api/question?spaceId=${spaceId}`);
    const data = await res.json();
    
    if (res.ok) {
      setQuestions(data); // 取得したデータをstateへ
    }
  } catch (error) {
    console.error("取得失敗:", error);
  }
};

  const handleSaveQuestion = async (title: string, question: string, tag: number) => {
    try {
      const response = await fetch(`/api/question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          question, 
          tag,
          space_id: parseInt(spaceId as string) 
        }),
      });

      if (response.ok) {
        console.log("作成成功");
        getQuestions();
        // 必要に応じて一覧再取得の関数などをここに呼ぶ
      }
    } catch (error) {
      console.error("送信エラー:", error);
    }
  };

  // 削除処理の例
const handleDelete = async (id: number) => {
  if (!confirm("本当に削除しますか？")) return;
  
  // ここでAPIを叩いて削除処理を行う
  const res = await fetch(`/api/question/${id}`, {
     method: "DELETE",
    body: JSON.stringify({ space_id: spaceId })
   });
  if (res.ok) {
    getQuestions(); // 再取得して一覧を更新
  }
};

// 完了/未完了の切り替え処理の例
const handleToggleComplete = async (task: any) => {
  const newStatus = task.is_resolved === 0 ? 1 : 0;
  try {
    const res = await fetch(`/api/question/${task.id}/status`, { // IDをURLに含める形式が安全
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        is_resolved: newStatus,
        space_id: spaceId // 権限チェック用に必要
      }),
    });
    
    if (res.ok) {
      getQuestions(); // 成功したら一覧を再取得して画面を更新
    }
  } catch (e) {
    console.error("更新エラー:", e);
  }
};

// 1. 状態管理を追加
const [editingTask, setEditingTask] = useState<any>(null);
const [isModalOpen, setIsModalOpen] = useState(false);

// 2. 編集ボタン用関数
const handleEdit = (task: any) => {
  setEditingTask(task); // 編集対象をセット
  setIsModalOpen(true); // モーダルを開く
};
// 3. 保存・更新の分岐処理
const handleSave = async (title: string, question: string, tag: number, id?: number) => {
  if (id) {
    // 編集モード：PATCH で更新
    await fetch(`/api/question/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, question, space_id: spaceId })
    });
  } else {
    // 新規作成モード：POST で作成
    await fetch(`/api/question`, {
      method: "POST",
      // ...既存のPOST処理
    });
  }
  getQuestions();
};


    // 4. Return 内でモーダルを表示
return (
  <section>
    <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }}>新規作成</button>
    
    <TaskList tasks={taskData} onDelete={handleDelete} onEdit={handleEdit} />

    {isModalOpen && (
      <QuestionModal 
        onSave={handleSave} 
        initialData={editingTask} 
        onClose={() => setIsModalOpen(false)} 
      />
    )}
  </section>
);
}