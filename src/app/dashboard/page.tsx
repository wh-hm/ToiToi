"use client";
"use client"
import { useRouter } from "next/navigation"
import  Header  from "@/components/Header"
import  Footer  from "@/components/Footer"
import  SpaceModal  from "@/components/SpaceModal"
import { useState, useEffect } from "react"; 
import { useSession } from "next-auth/react";
import SpaceList from "@/components/SpaceList"


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
export default function Dashboard() {
  const { data: session, status } = useSession(); // セッションの現在の状態を取得
  const router = useRouter();
  const [spaces, setSpaces] = useState({ type1: [], type2: [], type3: [] });
  const [isLoading, setIsLoading] = useState(true);
  // 既存の const の下に追加
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [editingSpace, setEditingSpace] = useState<{ id: string; name: string } | null>(null);

  //おきに利
  const handleToggleFavorite = async (id: number) => {
    await fetch(`/api/dashboard/spaces/${id}/favorite`, { method: "PATCH" });
    fetchSpaces(); // 一覧再取得
  };

  // モーダルを開く関数
  const openModal = (type: number) => {
    setSelectedType(type);
    setIsModalOpen(true);
  };
  const handleEdit = (space: any) => {
    setEditingSpace(space); // 編集対象のデータをセット
    setSelectedType(space.space_type);
    setIsModalOpen(true); // モーダルを開く
  };

  
  const handleDelete = async (id: string) => {
  if (!confirm("本当に削除しますか？")) return;

  try {
    const res = await fetch(`/api/dashboard/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchSpaces(); // 再取得して画面を更新
    }
  } catch (error) {
    console.error("削除失敗:", error);
  }
};
  useEffect(() => {
        // ステータスが "unauthenticated"（未ログイン）なら強制的にトップへ飛ばす
        if (status === "unauthenticated") {
          router.push("/"); 
        }
    }, [status, router]);

    const fetchSpaces = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true); // ロード中表示
    try {
      const res = await fetch(`/api/dashboard/?userId=${session.user.id}`);
      const data = await res.json();
      setSpaces(data);
    } catch (error) {
      console.error("データの取得に失敗しました", error);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchSpaces();
  }, [session]);

    // 読み込み中は何も表示しない、またはローディング画面を出す
    if (status === "loading") {
      return <div>読み込み中...</div>;
    }
  return (
    <>
      <Header />
      <section>
        <div>ダッシュボード</div>

        <SpaceList title="チャット" items={spaces.type1} onEdit={handleEdit} onDelete={handleDelete} toggleFavorite={handleToggleFavorite}/>
        <SpaceList title="ToDoリスト" items={spaces.type2} onEdit={handleEdit} onDelete={handleDelete} toggleFavorite={handleToggleFavorite}/>
        <SpaceList title="質問" items={spaces.type3} onEdit={handleEdit} onDelete={handleDelete} toggleFavorite={handleToggleFavorite}/>

        <button onClick={() => { setEditingSpace(null); openModal(1); }}>チャット作成</button>
        <button onClick={() => { setEditingSpace(null); openModal(2); }}>Todo作成</button>
        <button onClick={() => { setEditingSpace(null); openModal(3); }}>質問作成</button>
      </section>
      
      <SpaceModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false)
          setEditingSpace(null);
        }}
        spaceType={selectedType ?? 1}
        onSuccess={() => {
          setIsModalOpen(false); // モーダルを閉じる
          fetchSpaces();         // ★データを再取得して画面を更新！
        }}
        editingSpace={editingSpace}
      />
      <Footer />
    </>
  );

  //以下、るかの奴
//   "use client";

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






// login-usのブランチからの奴
// "use client";
// import { useRouter } from "next/navigation"
// import  Header  from "@/components/Header"
// import  Footer  from "@/components/Footer"
// import  SpaceModal  from "@/components/SpaceModal"
// import { useState, useEffect } from "react"; 
// import { useSession } from "next-auth/react";
// import SpaceList from "@/components/SpaceList"


// export default function Dashboard() {
//   const { data: session, status } = useSession(); // セッションの現在の状態を取得
//   const router = useRouter();
//   const [spaces, setSpaces] = useState({ type1: [], type2: [], type3: [] });
//   const [isLoading, setIsLoading] = useState(true);
//   // 既存の const の下に追加
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedType, setSelectedType] = useState<number | null>(null);
//   const [editingSpace, setEditingSpace] = useState<{ id: string; name: string } | null>(null);

//   //おきに利
//   const handleToggleFavorite = async (id: number) => {
//     await fetch(`/api/dashboard/spaces/${id}/favorite`, { method: "PATCH" });
//     fetchSpaces(); // 一覧再取得
//   };

//   // モーダルを開く関数
//   const openModal = (type: number) => {
//     setSelectedType(type);
//     setIsModalOpen(true);
//   };
//   const handleEdit = (space: any) => {
//     setEditingSpace(space); // 編集対象のデータをセット
//     setSelectedType(space.space_type);
//     setIsModalOpen(true); // モーダルを開く
//   };

  
//   const handleDelete = async (id: string) => {
//   if (!confirm("本当に削除しますか？")) return;

//   try {
//     const res = await fetch(`/api/dashboard/spaces/${id}`, { method: "DELETE" });
//     if (res.ok) {
//       fetchSpaces(); // 再取得して画面を更新
//     }
//   } catch (error) {
//     console.error("削除失敗:", error);
//   }
// };
//   useEffect(() => {
//         // ステータスが "unauthenticated"（未ログイン）なら強制的にトップへ飛ばす
//         if (status === "unauthenticated") {
//           router.push("/"); 
//         }
//     }, [status, router]);

//     const fetchSpaces = async () => {
//     if (!session?.user?.id) return;
//     setIsLoading(true); // ロード中表示
//     try {
//       const res = await fetch(`/api/dashboard/spaces?userId=${session.user.id}`);
//       const data = await res.json();
//       setSpaces(data);
//     } catch (error) {
//       console.error("データの取得に失敗しました", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };
//   useEffect(() => {
//     fetchSpaces();
//   }, [session]);

//     // 読み込み中は何も表示しない、またはローディング画面を出す
//     if (status === "loading") {
//       return <div>読み込み中...</div>;
//     }
//   return (
//     <>
//       <Header />
//       <section>
//         <div>ダッシュボード</div>

//         <SpaceList title="チャット" items={spaces.type1} onEdit={handleEdit} onDelete={handleDelete} toggleFavorite={handleToggleFavorite}/>
//         <SpaceList title="ToDoリスト" items={spaces.type2} onEdit={handleEdit} onDelete={handleDelete} toggleFavorite={handleToggleFavorite}/>
//         <SpaceList title="質問" items={spaces.type3} onEdit={handleEdit} onDelete={handleDelete} toggleFavorite={handleToggleFavorite}/>

//         <button onClick={() => { setEditingSpace(null); openModal(1); }}>チャット作成</button>
//         <button onClick={() => { setEditingSpace(null); openModal(2); }}>Todo作成</button>
//         <button onClick={() => { setEditingSpace(null); openModal(3); }}>質問作成</button>
//       </section>
      
//       <SpaceModal 
//         isOpen={isModalOpen} 
//         onClose={() => {
//           setIsModalOpen(false)
//           setEditingSpace(null);
//         }}
//         spaceType={selectedType ?? 1}
//         onSuccess={() => {
//           setIsModalOpen(false); // モーダルを閉じる
//           fetchSpaces();         // ★データを再取得して画面を更新！
//         }}
//         editingSpace={editingSpace}
//       />
//       <Footer />
//     </>
//   );

// }

}
