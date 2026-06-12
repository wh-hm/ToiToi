"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Trash2, User, Settings, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, useDisclosure } from "@nextui-org/react";

export default function MyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [spaces, setSpaces] = useState({ type1: [], type2: [], type3: [] });
  const [username, setUsername] = useState("");
  const [imageCount, setImageCount] = useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // データ再取得用の関数を useCallback で定義
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/user/account");
      if (!res.ok) throw new Error("取得失敗");
      const json = await res.json();
      setUsername(json.user?.username || "ユーザー");
      setSpaces(json.spaces || { type1: [], type2: [], type3: [] });
      setImageCount(json.imageCount || 0);
    } catch (e) {
      toast.error("データ取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setNewName(username);
    }
  }, [isOpen, username]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleAction = async (action: string, label: string) => {
    if (!confirm(`${label}を実行しますか？`)) return;

    try {
      const res = await fetch(`/api/${action}`, { method: "DELETE" });
      const result = await res.json();
      
      // 削除失敗時はエラーを投げて catch に飛ばす
      if (!res.ok) throw new Error(result.error || "操作に失敗しました");
      
      toast.success(result.message);

      // ユーザー削除の場合の特別処理
      if (action === "user/account") {
        // データを再取得せず、即座にログアウト処理へ
        await signOut({ callbackUrl: "/" });
        return; // ここで処理を終了し、下の fetchData() を呼ばない
      }

      // それ以外の削除処理（タスク削除など）
      await fetchData();
      
    } catch (e: any) {
      console.error(e);
      toast.error(e.message);
    }
  };
  const handleUpdateUsername = async () => {
    if (!newName.trim()) return toast.error("ユーザー名を入力してください");
    
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newName }),
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "更新に失敗しました");

      toast.success("ユーザー名を変更しました");
      setUsername(newName);
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
    </div>
  );

  return (
    <section className="max-w-xl mx-auto p-6 space-y-10 min-h-[calc(100vh-112px)] flex flex-col justify-center">
      {/* 1. プロフィール */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700">
          <User className="w-5 h-5" /> ユーザー設定
        </h2>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
          <span className="text-gray-600 font-medium">{username}</span>
          <button onClick={onOpen} className="text-blue-600 font-bold hover:underline">変更する</button>
        </div>
      </div>

      {/* モーダル */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <form onSubmit={(e) => { e.preventDefault(); handleUpdateUsername(); }}>
            <ModalHeader>ユーザー名の変更</ModalHeader>
            <ModalBody>
              <Input 
                autoFocus 
                label="新しいユーザー名" 
                value={newName} // ステートをバインド
                onChange={(e) => setNewName(e.target.value)} 
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>キャンセル</Button>
              <Button color="primary" type="submit" isLoading={isSaving}>保存</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* 2. データ削除エリア */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700">
          <Settings className="w-5 h-5" /> データ管理
        </h2>
        <div className="grid gap-3">
          {[
            { label: "チャット全削除", action: "chats", count: spaces?.type1?.length ?? 0 },
            { label: "タスク全削除", action: "tasks", count: spaces?.type2?.length ?? 0 },
            { label: "質問全削除", action: "questions", count: spaces?.type3?.length ?? 0 },
            { label: "画像全削除", action: "delete/images", count: imageCount },
          ].map((item) => (
            <button 
              key={item.action}
              disabled={item.count === 0}
              onClick={() => handleAction(item.action, item.label)}
              className={`w-full flex items-center justify-between p-4 rounded-xl font-medium transition-all ${
                item.count === 0
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                  : "bg-white border border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-700 hover:text-red-600"
              }`}
            >
              {item.label}
              <Trash2 className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* 3. アカウント操作 */}
      <div className="pt-8 border-t border-gray-100 space-y-4">
        <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold transition-all">ログアウト</button>
        <button onClick={() => handleAction("user/account", "アカウント削除")} className="w-full text-red-500 hover:bg-red-50 font-medium py-3 rounded-xl transition-all">アカウントを削除</button>
      </div>
    </section>
  );
}