"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Trash2, User, Settings, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, useDisclosure } from "@nextui-org/react";
import { Loading } from "@/components/LoadingSpinner";

export default function MyPage() {
  const router = useRouter();
  const { status } = useSession(); // セッション状態を取得
  const [loading, setLoading] = useState(true);
  const [spaces, setSpaces] = useState({ type1: [], type2: [], type3: [] });
  const [username, setUsername] = useState("");
  const [imageCount, setImageCount] = useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [archiveCount, setArchiveCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. 認証ガード：セッションがない場合はログインページへリダイレクト
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // 2. データ取得処理（すべてのフックの後に配置）
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/user/account");
      if (!res.ok) throw new Error("取得失敗");
      const json = await res.json();
      
      const rawSpaces = json.spaces || { type1: [], type2: [], type3: [] };
      const allItems = [
        ...(rawSpaces.type1 || []),
        ...(rawSpaces.type2 || []),
        ...(rawSpaces.type3 || [])
      ];
      
      const archivedItems = allItems.filter(item => item.is_archived === 1);
      setArchiveCount(archivedItems.length);
      
      setSpaces({
        type1: rawSpaces.type1 || [],
        type2: rawSpaces.type2 || [],
        type3: rawSpaces.type3 || [],
      });

      setUsername(json.user?.username);
      setImageCount(json.imageCount || 0);
    } catch (e) {
      toast.error("データ取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) setNewName(username);
  }, [isOpen, username]);

  useEffect(() => {
    if (status === "authenticated") fetchData();
  }, [status, fetchData]);

  // 3. ローディング・未認証時の表示分岐
  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
      </div>
    );
  }

  // 4. メインレンダリング
  const handleAction = async (action: string, label: string) => {
    if (!confirm(`${label}を実行しますか？`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/${action}`, { method: "DELETE" });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "操作に失敗しました");
      toast.success(result.message);
      if (action === "user/account") {
        await signOut({ callbackUrl: "/" });
        return;
      }
      await fetchData();
    } catch (e: any) {
      toast.error(e.message || "処理に失敗しました");
    } finally {
      setIsDeleting(false);
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

  return (
    <section className="max-w-xl mx-auto p-6 space-y-10 min-h-[calc(100vh-112px)] flex flex-col justify-center">
      {/* ユーザー設定 */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700">
          <User className="w-5 h-5" /> ユーザー設定
        </h2>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
          <span className="text-gray-600 font-medium">{username}</span>
          <button onClick={onOpen} className="text-blue-600 font-bold hover:underline">変更する</button>
        </div>
      </div>

      {/* ユーザー名変更モーダル */}
      <Modal isOpen={isOpen} onClose={onClose} placement="center">
        <ModalContent>
          <form onSubmit={(e) => { e.preventDefault(); handleUpdateUsername(); }}>
            <ModalHeader>ユーザー名の変更</ModalHeader>
            <ModalBody>
              <Input autoFocus label="新しいユーザー名" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>キャンセル</Button>
              <Button color="primary" type="submit" isLoading={isSaving}>保存</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* データ管理 */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700">
          <Settings className="w-5 h-5" /> データ管理
        </h2>
        <div className="grid gap-3">
          {[
            { label: "チャット全削除", action: "spaces/chats", count: spaces?.type1?.length ?? 0 },
            { label: "タスク全削除", action: "spaces/tasks", count: spaces?.type2?.length ?? 0 },
            { label: "質問全削除", action: "spaces/questions", count: spaces?.type3?.length ?? 0 },
            { label: "スペース全削除", action: "spaces", count: (spaces?.type1?.length ?? 0) + (spaces?.type2?.length ?? 0) + (spaces?.type3?.length ?? 0) },
            { label: "アーカイブ全削除", action: "spaces/archive", count: archiveCount ?? 0 },
            { label: "画像全削除", action: "images", count: imageCount },
          ].map((item) => (
            <button key={item.action} disabled={item.count === 0} onClick={() => handleAction(item.action, item.label)} className={`w-full flex items-center justify-between p-4 rounded-xl font-medium transition-all ${item.count === 0 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white border border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-700 hover:text-red-600"}`}>
              {item.label} <Trash2 className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* アカウント操作 */}
      <div className="pt-8 border-t border-gray-100 space-y-4">
        <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold transition-all">ログアウト</button>
        <button onClick={() => handleAction("user/account", "アカウント削除")} className="w-full text-red-500 hover:bg-red-50 font-medium py-3 rounded-xl transition-all">アカウントを削除</button>
      </div>
      
      {isDeleting && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
            <Loading size="lg" text="データを削除中..." />
          </div>
        </div>
      )}
    </section>
  );
}