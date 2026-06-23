"use client";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import ChatInput from "@/components/chat/ChatInput";
import ChatList from "@/components/chat/ChatList";
import { ChatMessage } from "@/types/chat";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [editValue, setEditValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [spaceId, setSpaceId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [send, setSend] = useState(0);
  
  // ★配列で管理に変更
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (messages.length > 0 && scrollRef.current && send === 0) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      setSend(1);
    }
  }, [messages]);

  useEffect(() => {
    params.then((p) => setSpaceId(Number(p.id)));
  }, [params]);

  const fetchMessages = async () => {
    const { id } = await params;
    const res = await fetch(`/api/chats?spaceId=${id}`);
    const data = await res.json();
    setMessages(data);
  };

  // ★画像追加処理：5枚制限
  const handleFileSelect = (file: File) => {
    if (selectedFiles.length >= 5) {
      toast.error("一度に送信できるのは5枚までです");
      return;
    }
    setSelectedFiles((prev) => [...prev, file]);
  };

  // ★削除処理
  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (stampId?: string) => {
    if (isSubmitting) return;
    const { id } = await params;
    
    // メッセージもスタンプも画像もない場合は何もしない
    if (!inputText.trim() && !stampId && selectedFiles.length === 0) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("space_id", id);
    if (inputText.trim()) formData.append("message", inputText);
    if (stampId) formData.append("stamp", stampId);
    
    // ★配列をループして append
    selectedFiles.forEach((file) => {
      formData.append("images", file);
    });

    try {
      const res = await fetch(`/api/chats/`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("送信失敗");
      
      setInputText("");
      setSelectedFiles([]); // リセット
      
      await fetchMessages();
      setSend(0);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (isSubmitting || !editingId || spaceId === null) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/chats/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: editValue, space_id: spaceId }),
      });
      if (!res.ok) throw new Error("更新失敗");
      setEditingId(null);
      setEditValue("");
      await fetchMessages();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (chatId: number, sId: number) => {
    await fetch(`/api/chats/${chatId}?space_id=${sId}`, { method: "DELETE" });
    fetchMessages();
  };

  const handleToggleFavorite = async (chatId: number, current: number) => {
    await fetch(`/api/chats/${chatId}/favorite`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite_flag: current === 1 ? 0 : 1 }),
    });
    fetchMessages();
  };

  const changeBackground = async (chatId: number, bg: number) => {
    await fetch(`/api/chats/${chatId}/background`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ background: bg }),
    });
    fetchMessages();
  };

  const handleDownload = async (imageUrl: string) => {
    // ダウンロード処理を開始
    const response = await fetch("/api/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUrl: imageUrl })
    });

    if (!response.ok) {
      console.error("APIエラー");
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    // <a>タグをプログラム的に作成
    const a = document.createElement("a");
    a.href = url;
    a.download = "download.png"; // ファイル名
    
    // bodyに追加してクリック
    document.body.appendChild(a);
    a.click();
    
    // 後片付け
    a.remove();
    window.URL.revokeObjectURL(url);
  };
  useEffect(() => { fetchMessages(); }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-gray-50">
      <div className="flex-1 overflow-y-auto relative w-full">
        <ChatList 
          messages={messages}
          spaceId={spaceId || 0}
          isSubmitting={isSubmitting}
          ref={scrollRef}
          onToggleFavorite={handleToggleFavorite}
          onEdit={setEditingId}
          onDelete={handleDeleteClick}
          onBackgroundChange={changeBackground}
          setEditValue={setEditValue}
          onDownload={handleDownload}
          type="chat"
        />
      </div>

      {editingId && (
        <div className="flex-shrink-0 bg-blue-100 p-2 text-sm text-blue-800 px-4">
          編集モード中
        </div>
      )}

      {/* ※プレビューの表示部分は ChatInput 内部へ完全に移動させたので、
        ここでは ChatInput コンポーネントに配列を渡すだけでOKです。
      */}
      <div className="flex-shrink-0 w-full">
        <ChatInput 
          value={editingId ? editValue : inputText}
          onChange={editingId ? setEditValue : setInputText} 
          onSend={editingId ? handleUpdate : () => handleSend()}
          onSendStamp={(s) => handleSend(s)} 
          onUploadImage={handleFileSelect}
          onRemoveFile={handleRemoveFile} // 削除関数を追加
          selectedFiles={selectedFiles}   // 配列を渡す
          disabled={isSubmitting}
        />
      </div>
    </div>
  );
}