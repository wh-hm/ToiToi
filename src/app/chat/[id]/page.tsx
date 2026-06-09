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

  useEffect(() => {
    if (messages.length > 0 && scrollRef.current && send===0) {
      // ここで直接高さを指定する
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
    if (res.ok) setMessages(await res.json());
  };

  const handleSend = async (stampId?: string, fileData?: File) => {
    if (isSubmitting) return;
    const { id } = await params;
    if (!inputText.trim() && !stampId && !fileData) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("space_id", id);
    if (inputText.trim()) formData.append("message", inputText);
    if (stampId) formData.append("stamp", stampId);
    if (fileData) formData.append("image", fileData);

    try {
      const res = await fetch(`/api/chats/`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("送信失敗");
      setInputText("");
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

  // その他のハンドラはそのまま...
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

  useEffect(() => { fetchMessages(); }, []);

  // ChatPage.tsx のリターン部分をこれに置き換えてください
return (
  <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-gray-50">
    {/* 1. リストエリア：flex-1 でヘッダーと入力欄の間を埋め尽くす */}
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
        type="chat"
      />
    </div>

    {/* 2. 編集モード通知 */}
    {editingId && (
      <div className="flex-shrink-0 bg-blue-100 p-2 text-sm text-blue-800 px-4">
        編集モード中
      </div>
    )}

    {/* 3. 入力エリア：flex-shrink-0 で必ず最後に配置 */}
    <div className="flex-shrink-0 w-full">
      <ChatInput 
        value={editingId ? editValue : inputText}
        onChange={editingId ? setEditValue : setInputText} 
        onSend={editingId ? handleUpdate : () => handleSend()}
        onSendStamp={(s) => handleSend(s)} 
        onUploadImage={(f) => handleSend(undefined, f)}
        disabled={isSubmitting}
      />
    </div>
  </div>
);
}