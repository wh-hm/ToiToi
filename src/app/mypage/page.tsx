"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Trash2, User, Settings, Loader2 } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, useDisclosure } from "@nextui-org/react";
import { Loading } from "@/components/LoadingSpinner";
// 💡 自作の可愛いコンポーネントたちを正しくインポート
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { ToiToiNotification } from "@/components/Toast";
import { fetchWithTimeout } from "@/lib/api";
import { handleApiResponse } from "@/lib/api-utils";

export default function MyPage() {
  const router = useRouter();
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [spaces, setSpaces] = useState({ type1: [], type2: [], type3: [] });
  const [username, setUsername] = useState("");
  const [imageCount, setImageCount] = useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [archiveCount, setArchiveCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // 💡 【ここを修正】複数の処理を1つで受け止めるための共通State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    onConfirm: () => {},
  });

  // 1. 認証ガード
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // 2. データ取得処理
  const fetchData = useCallback(async () => {
    try {
      const res = await fetchWithTimeout("/api/user/account");
      if (!res.ok) {
          await handleApiResponse(res); // 内部のthrowを待つ
          throw new Error(); // 明示的にエラーを投げる
      }
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
      ToiToiNotification.error("データ取得に失敗しました");
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

  // 💡 【ここを追加】どんな削除処理でもこれ1つでモーダルを開けるようにする魔法の関数
  const openConfirmModal = (label: string, onConfirmAction: () => void) => {
    setModalConfig({
      isOpen: true,
      title: `本当に${label}する？`,
      onConfirm: onConfirmAction, // 動かしたい中身をそのままStateに預ける
    });
  };

  // 💡 【ここを修正】共通化されたAPI削除の実行処理
  const executeDelete = async (action: string) => {
    setIsDeleting(true);
    try {
      const res = await fetchWithTimeout(`/api/${action}`, { method: "DELETE" });
      if (!res.ok) {
        await handleApiResponse(res); // 内部のthrowを待つ
        throw new Error(); // 明示的にエラーを投げる
      }
      
      if (action === "user/account") {
        await signOut({ callbackUrl: "/" });
        return;
      }
      await fetchData();
    } catch (e: any) {
      ToiToiNotification.error(e.message || "処理に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateUsername = async () => {
    if (!newName.trim()) return ToiToiNotification.error("ユーザー名を入力してください");
    setIsSaving(true);
    try {
      const res = await fetchWithTimeout("/api/user/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newName }),
      });
      if (!res.ok) {
        await handleApiResponse(res); // 内部のthrowを待つ
        throw new Error(); // 明示的にエラーを投げる
      }
      const result = await res.json();
      
      ToiToiNotification.success("ユーザー名を変更しました");
      setUsername(newName);
      onClose();
    } catch (e: any) {
      ToiToiNotification.error(e.message);
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
            <button 
              key={item.action} 
              disabled={item.count === 0} 
              /* 💡 1行で文章とそのあとの関数をセットで渡す！ */
              onClick={() => openConfirmModal(item.label, () => executeDelete(item.action))} 
              className={`w-full flex items-center justify-between p-4 rounded-xl font-medium transition-all ${item.count === 0 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white border border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-700 hover:text-red-600"}`}
            >
              {item.label} <Trash2 className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* アカウント操作 */}
      <div className="pt-8 border-t border-gray-100 space-y-4">
        <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold transition-all">ログアウト</button>
        {/* 💡 ここも共通の関数に文章と削除アクションを渡すだけ */}
        <button onClick={() => openConfirmModal("アカウント削除", () => executeDelete("user/account"))} className="w-full text-red-500 hover:bg-red-50 font-medium py-3 rounded-xl transition-all">アカウントを削除</button>
      </div>
      
      {isDeleting && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
            <Loading size="lg" text="データを削除中..." />
          </div>
        </div>
      )}

      {/* 💡 【ここを修正】Stateがまとまったので、タグの指定もすっきり1つに集約 */}
      <DeleteConfirmModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfig.onConfirm}
      />
    </section>
  );
}