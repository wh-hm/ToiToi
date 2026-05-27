"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import  Header  from "@/components/Header"
import  Footer  from "@/components/Footer"

export default function MyPage() {
  const router = useRouter();

  // 1. リクエスト処理関数
  const handleRequest = async (action: string, method: string = "POST", data: any = null) => {
    if (method !== "PATCH" && !confirm(`${action}を実行しますか？`)) return;

    const options: RequestInit = {
      method: method,
      headers: { "Content-Type": "application/json" },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const res = await fetch(`/api/myPage/${action}`, options);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "処理に失敗しました");
      }

      alert(result.message);

      // 2. 成功後の遷移処理
      if (action === "delete/account") {
        // アカウント削除ならセッションを破棄してログインへ
        await signOut({ callbackUrl: "/" });
      } else if (action === "user/logout") {
        await signOut({ callbackUrl: "/" });
      } else {
        // その他の操作なら画面更新
        router.refresh();
      }
    } catch (error: any) {
      alert("エラー: " + error.message);
    }
  };

  // return (
  //   <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px", maxWidth: "300px" }}>
  //     <h2>マイページ設定</h2>
      
  //     <input type="text" placeholder="新しいユーザー名" id="newNameInput" />
  //     <button onClick={() => {
  //       const input = document.getElementById("newNameInput") as HTMLInputElement;
  //       handleRequest("user/changeUsername", "PATCH", { newName: input.value });
  //     }}>
  //       ユーザー名変更
  //     </button>

  //     <hr style={{ width: "100%" }} />

  //     <button onClick={() => handleRequest("delete/task", "DELETE")}>ToDo全削除</button>
  //     <button onClick={() => handleRequest("delete/chat", "DELETE")}>チャット全削除</button>
  //     <button onClick={() => handleRequest("delete/question", "DELETE")}>質問全削除</button>
  //     <button onClick={() => handleRequest("delete/space", "DELETE")}>スペース全削除</button>
  //     <button onClick={() => handleRequest("delete/account", "DELETE")}>アカウント削除</button>
  //     <button onClick={() => handleRequest("user/logout", "POST")}>ログアウト</button>
  //   </div>
  // );
  //コメントアウトは、細川の書いたやつ、以下はるかのやつ

  return (
    <>
        <Header/>
    <section className="max-w-md mx-auto p-6 space-y-8">

      {/* プロフィール */}
      <div className="flex flex-col items-center space-y-3">
        <div className="w-20 h-20 bg-gray-300 rounded-full" />
        <h2 className="text-xl font-bold">ユーザー名</h2>

        <div className="w-full bg-gray-100 p-4 rounded-lg flex justify-between items-center">
          <span>現在のユーザー名</span>
          <button className="text-blue-600 font-semibold">ユーザー名変更</button>
        </div>
      </div>

      {/* データ削除 */}
      <div className="bg-red-50 p-4 rounded-lg space-y-3">
        <button className="w-full bg-red-500 text-white py-2 rounded">ToDo全削除</button>
        <button className="w-full bg-red-500 text-white py-2 rounded">チャット全削除</button>
        <button className="w-full bg-red-500 text-white py-2 rounded">質問全削除</button>

        <p className="text-red-600 text-sm text-center">
          注意：この操作は取り消せません。
        </p>
      </div>

      {/* アカウント操作 */}
      <div className="space-y-3">
        <button className="w-full bg-red-600 text-white py-2 rounded">
          アカウント削除
        </button>
        <button className="w-full bg-gray-300 py-2 rounded">
          ログアウト
        </button>
      </div>

    </section>
    <Footer/>
    </>
  );

}

// 以下、るか
// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import Header from "@/components/Header";
// import Footer from "@/components/Footer";

// export default function DashboardPage() {
//   const router = useRouter();

//   const [chats, setChats] = useState<string[]>([]);
//   const [todos, setTodos] = useState<string[]>([]);
//   const [questions, setQuestions] = useState<string[]>([]);

//   const [modalType, setModalType] = useState<"edit" | "delete" | null>(null);
//   const [targetItem, setTargetItem] = useState<string | null>(null);

//   // ★ 新規作成モーダルの開閉
//   const [createModalOpen, setCreateModalOpen] = useState(false);

//   const openModal = (type: "edit" | "delete", item: string) => {
//     setModalType(type);
//     setTargetItem(item);
//   };

//   const closeModal = () => {
//     setModalType(null);
//     setTargetItem(null);
//   };

//   return (
//     <>
//       <Header />

//       <section className="max-w-md mx-auto p-6 space-y-8">

//         <DropdownCategory
//           title="チャット"
//           items={chats}
//           onClickItem={(item) => router.push(`/chat/${item}`)}
//           onEdit={(item) => openModal("edit", item)}
//           onDelete={(item) => openModal("delete", item)}
//         />

//         <DropdownCategory
//           title="ToDoリスト"
//           items={todos}
//           onClickItem={(item) => router.push(`/todo/${item}`)}
//           onEdit={(item) => openModal("edit", item)}
//           onDelete={(item) => openModal("delete", item)}
//         />

//         <DropdownCategory
//           title="質問"
//           items={questions}
//           onClickItem={(item) => router.push(`/question/${item}`)}
//           onEdit={(item) => openModal("edit", item)}
//           onDelete={(item) => openModal("delete", item)}
//         />

//         {/* ★ 新規作成ボタン */}
//         <button
//           className="w-full bg-blue-600 text-white py-2 rounded"
//           onClick={() => setCreateModalOpen(true)}
//         >
//           新規作成
//         </button>
//       </section>

//       <Footer />

//       {/* 編集 / 削除モーダル */}
//       {modalType && targetItem && (
//         <Modal type={modalType} item={targetItem} onClose={closeModal} />
//       )}

//       {/* ★ 新規作成モーダル */}
//       {createModalOpen && (
//         <CreateSelectModal onClose={() => setCreateModalOpen(false)} />
//       )}
//     </>
//   );
// }

// /* ▼▼▼ 以下コンポーネント ▼▼▼ */

// function DropdownCategory({
//   title,
//   items,
//   onClickItem,
//   onEdit,
//   onDelete,
// }: {
//   title: string;
//   items: string[];
//   onClickItem: (item: string) => void;
//   onEdit: (item: string) => void;
//   onDelete: (item: string) => void;
// }) {
//   const [open, setOpen] = useState(false);

//   return (
//     <div className="space-y-2">
//       <button
//         className="w-full flex justify-between items-center bg-gray-200 p-3 rounded"
//         onClick={() => setOpen(!open)}
//       >
//         <span>{title}</span>
//         <span>{open ? "▲" : "▼"}</span>
//       </button>

//       {open && (
//         <div className="space-y-2">
//           {items.length === 0 ? (
//             <p className="text-gray-500 text-sm">まだありません</p>
//           ) : (
//             items.map((item) => (
//               <div
//                 key={item}
//                 className="flex justify-between bg-white p-3 rounded shadow"
//               >
//                 <button
//                   className="font-semibold"
//                   onClick={() => onClickItem(item)}
//                 >
//                   {item}
//                 </button>

//                 <div className="space-x-3">
//                   <button className="text-blue-600" onClick={() => onEdit(item)}>
//                     編集
//                   </button>
//                   <button className="text-red-600" onClick={() => onDelete(item)}>
//                     削除
//                   </button>
//                 </div>
//               </div>
//             ))
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// function Modal({
//   type,
//   item,
//   onClose,
// }: {
//   type: "edit" | "delete";
//   item: string;
//   onClose: () => void;
// }) {
//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
//       <div className="bg-white p-6 rounded shadow space-y-4 w-72">
//         <h3 className="text-lg font-bold">
//           {type === "edit" ? "編集" : "削除"}: {item}
//         </h3>

//         <p>
//           {type === "delete"
//             ? "本当に削除しますか？この操作は取り消せません。"
//             : "編集内容を入力してください。"}
//         </p>

//         <div className="flex justify-end space-x-3">
//           <button className="px-3 py-1 bg-gray-300 rounded" onClick={onClose}>
//             キャンセル
//           </button>
//           <button className="px-3 py-1 bg-blue-600 text-white rounded">
//             OK
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// function CreateSelectModal({ onClose }: { onClose: () => void }) {
//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
//       <div className="bg-white p-6 rounded shadow space-y-4 w-72">
//         <h3 className="text-lg font-bold">どれを作成する？</h3>

//         <div className="space-y-3">
//           <a
//             href="/create/chat"
//             className="block bg-blue-500 text-white p-2 rounded text-center"
//           >
//             チャット
//           </a>
//           <a
//             href="/create/todo"
//             className="block bg-green-500 text-white p-2 rounded text-center"
//           >
//             ToDo
//           </a>
//           <a
//             href="/create/question"
//             className="block bg-purple-500 text-white p-2 rounded text-center"
//           >
//             質問
//           </a>
//         </div>

//         <button
//           className="w-full bg-gray-300 py-2 rounded"
//           onClick={onClose}
//         >
//           閉じる
//         </button>
//       </div>
//     </div>
//   );
// }

