"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Trash2, User, Settings, Loader2, Key } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, useDisclosure } from "@nextui-org/react";
import { Loading } from "@/components/LoadingSpinner";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { ToiToiNotification } from "@/components/Toast";
import { fetchWithTimeout } from "@/lib/api";
import { handleApiResponse } from "@/lib/api-utils";
import { MESSAGES } from "@/constants/messages";

export default function MyPage() {
  const router = useRouter();
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [spaces, setSpaces] = useState({ chat: [], task: [], question: [] });
  
  // ユーザー情報State
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState(""); // 💡 招待用IDのState
  
  const [imageCount, setImageCount] = useState(0);
  const [archiveCount, setArchiveCount] = useState(0);
  
  // モーダル管理（ユーザー名用）
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 💡 モーダル管理（招待用ID用）
  const { isOpen: isUserIdOpen, onOpen: onUserIdOpen, onClose: onUserIdClose } = useDisclosure();
  const [newUserId, setNewUserId] = useState("");
  const [isSavingUserId, setIsSavingUserId] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isError, setIsError] = useState(true);

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
      ToiToiNotification.error(MESSAGES.E4003);
      router.push("/");
    }
  }, [status, router]);

  // 2. データ取得処理
  const fetchData = useCallback(async () => {
    if (status === "unauthenticated") {
      ToiToiNotification.error(MESSAGES.E4003);
      router.push("/");
    }
    setLoading(true);

    try {
      const res = await fetchWithTimeout("/api/user/account");
      if (!res.ok) {
          await handleApiResponse(res);
          throw new Error();
      }
      const data = await res.json();
      
      const rawSpaces = data.spaces || { chat: [], task: [], question: [] };
      const allItems = [
        ...(rawSpaces.chat || []),
        ...(rawSpaces.task || []),
        ...(rawSpaces.question || [])
      ];
      
      const archivedItems = allItems.filter(item => item.is_archived === 1);
      setArchiveCount(archivedItems.length);
      
      setSpaces({
        chat: rawSpaces.chat || [],
        task: rawSpaces.task || [],
        question: rawSpaces.question || [],
      });

      setUsername(data.user?.username || "");
      setUserId(data.user?.user_id || ""); // 💡 取得したuser_idをセット
      setImageCount(data.imageCount || 0);
      setIsError(false);
    } catch (e) {
      console.log(e)
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, [status, router]);

  useEffect(() => {
    if (isOpen) setNewName(username);
  }, [isOpen, username]);

  // 💡 招待ID変更モーダルが開いたとき、現在のIDを初期値にセット
  useEffect(() => {
    if (isUserIdOpen) setNewUserId(userId);
  }, [isUserIdOpen, userId]);

  useEffect(() => {
    fetchData();
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && status === "authenticated") {
        fetchData();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [fetchData, status]);

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
      </div>
    );
  }

  const openConfirmModal = (label: string, onConfirmAction: () => void) => {
    setModalConfig({
      isOpen: true,
      title: `本当に${label}する？`,
      onConfirm: onConfirmAction,
    });
  };

  const executeDelete = async (action: string) => {
    setIsDeleting(true);
    try {
      const res = await fetchWithTimeout(`/api/${action}`, { method: "DELETE" });
      if (!res.ok) {
        await handleApiResponse(res);
        throw new Error();
      }
      const data = await res.json();
      
      if (action === "user/account") {
        await signOut({ callbackUrl: "/" });
        return;
      }
      await fetchData();
      ToiToiNotification.success(data.message);
      window.dispatchEvent(new Event("refresh-header"));
    } catch (e: any) {
      console.log(e);
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
        await handleApiResponse(res);
        throw new Error();
      }
      const data = await res.json();
      ToiToiNotification.success(data.message);
      setUsername(newName);
      onClose();
    } catch (e: any) {
      console.log(e);
    } finally {
      setIsSaving(false);
    }
  };

  // 💡 招待用IDの更新処理
  const handleUpdateUserId = async () => {
    const trimmedId = newUserId.trim();
    if (!trimmedId) return ToiToiNotification.error("招待用IDを入力してください");
    
    // 半角英数字と一部の記号(-_)のみ許可するバリデーション
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedId)) {
      return ToiToiNotification.error("招待用IDは半角英数字とハイフン(-)、アンダースコア(_)のみ使用可能です");
    }

    setIsSavingUserId(true);
    try {
      const res = await fetchWithTimeout("/api/user/userid", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: trimmedId }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "招待用IDの更新に失敗しました");
      }
      
      ToiToiNotification.success(data.message || "招待用IDを更新しました");
      setUserId(trimmedId);
      onUserIdClose();
    } catch (e: any) {
      console.log(e);
      ToiToiNotification.error(e.message);
    } finally {
      setIsSavingUserId(false);
    }
  };

  return (
    <section className="max-w-xl mx-auto p-6 space-y-10 min-h-[calc(100vh-112px)] flex flex-col justify-center">
      
      {/* ユーザー設定 */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700">
          <User className="w-5 h-5" /> ユーザー設定
        </h2>
        
        <div className="space-y-4">
          {/* ユーザー名 */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-400 mb-1">ユーザー名</div>
              <div className="text-gray-700 font-medium">{username}</div>
            </div>
            <button 
              onClick={onOpen} 
              disabled={isError} 
              className="font-bold text-blue-600 hover:underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed disabled:opacity-80"
            >
              変更する
            </button>
          </div>

          {/* 招待用ID */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
                <Key className="w-4 h-4" /> 招待用ID
              </div>
              <div className="text-gray-700 font-medium">
                {userId ? userId : <span className="text-gray-400 italic font-normal">未設定</span>}
              </div>
            </div>
            <button 
              onClick={onUserIdOpen} 
              disabled={isError} 
              className="font-bold text-blue-600 hover:underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed disabled:opacity-80"
            >
              {userId ? "変更する" : "登録する"}
            </button>
          </div>
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

      {/* 招待用ID変更モーダル */}
      <Modal isOpen={isUserIdOpen} onClose={onUserIdClose} placement="center">
        <ModalContent>
          <form onSubmit={(e) => { e.preventDefault(); handleUpdateUserId(); }}>
            <ModalHeader>招待用IDの設定</ModalHeader>
            <ModalBody>
              <div className="text-sm text-gray-500 mb-2">
                他のユーザーからスペースに招待してもらうためのIDです。半角英数字（ハイフン、アンダースコア可）で入力してください。
              </div>
              <Input 
                autoFocus 
                label="新しい招待用ID" 
                placeholder="例: kurimanjuu"
                value={newUserId} 
                onChange={(e) => setNewUserId(e.target.value)} 
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onUserIdClose}>キャンセル</Button>
              <Button color="primary" type="submit" isLoading={isSavingUserId}>保存</Button>
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
            { label: "チャット全削除", action: "spaces/chats", count: spaces?.chat?.length ?? 0 },
            { label: "タスク全削除", action: "spaces/tasks", count: spaces?.task?.length ?? 0 },
            { label: "質問全削除", action: "spaces/questions", count: spaces?.question?.length ?? 0 },
            { label: "スペース全削除", action: "spaces", count: (spaces?.chat?.length ?? 0) + (spaces?.task?.length ?? 0) + (spaces?.question?.length ?? 0) },
            { label: "アーカイブ全削除", action: "spaces/archive", count: archiveCount ?? 0 },
            { label: "画像全削除", action: "images", count: imageCount },
          ].map((item) => (
            <button 
              key={item.action} 
              disabled={item.count === 0 || isError} 
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
        <button 
          onClick={async () => {
            try {
              await signOut({ callbackUrl: "/" });
            } catch (error) {
              console.error("ログアウトに失敗しました:", error);
              ToiToiNotification.error("ログアウトに失敗しました。通信環境を確認してください。");
            }
          }}
          className="w-full bg-gray-100 hover:bg-gray-200 py-3 rounded-xl font-bold transition-all">ログアウト</button>
        
        <button 
          disabled={isError} 
          onClick={() => openConfirmModal("アカウント削除", () => executeDelete("user/account"))} 
          className="w-full text-red-500 font-medium py-3 rounded-xl transition-all hover:bg-red-50 disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
        >
          アカウントを削除
        </button>
      </div>
      
      {isDeleting && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
            <Loading size="lg" text="データを削除中..." />
          </div>
        </div>
      )}

      <DeleteConfirmModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfig.onConfirm}
      />
    </section>
  );
}