'use client';
import { useState, useEffect, useRef, use } from "react";
import ChatInput from "@/components/chat/ChatInput";
import ChatList from "@/components/chat/ChatList";
import { ChatMessage } from "@/types/chat";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Question } from "@/types/question";
import { ChevronDown } from "lucide-react";

export default function ChatPage({ params }: { params: Promise<{ questionId: string, spaceId: string }> }) {
  const [inputText, setInputText] = useState("");
  const [editValue, setEditValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [send, setSend] = useState(0);
  const [question, setQuestion] = useState<Question>();
  
  // ★画像配列管理
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { questionId, spaceId } = use(params);
  const numericSpaceId = Number(spaceId);
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      toast.error("ログインが必要です");
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (messages.length > 0 && scrollRef.current && send === 0) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      setSend(1);
    }
  }, [messages]);
  
  useEffect(() => {
    if (questionId) fetchMessages();
  }, [questionId]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/questions/${questionId}/messages`);
      if (!res.ok) throw new Error("通信エラー");
      const data = await res.json();
      setMessages(data.messages || []);
      setQuestion(data.question);
    } catch (error) {
      console.error("メッセージ取得エラー:", error);
    }
  };

  // ★画像追加（5枚制限）
  const handleFileSelect = (file: File) => {
    if (selectedFiles.length >= 5) {
      toast.error("一度に送信できるのは5枚までです");
      return;
    }
    setSelectedFiles((prev) => [...prev, file]);
  };

  // ★画像削除
  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (stampId?: string) => {
    if (isSubmitting) return;
    if (!inputText.trim() && !stampId && selectedFiles.length === 0) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("questionId", questionId);
    formData.append("space_id", spaceId);
    if (inputText.trim()) formData.append("message", inputText);
    if (stampId) formData.append("stamp", stampId);
    
    // 画像配列を append
    selectedFiles.forEach((file) => {
      formData.append("images", file);
    });

    try {
      const res = await fetch(`/api/questions/${questionId}/messages`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("送信失敗");
      
      setInputText("");
      setSelectedFiles([]);
      await fetchMessages();
      setSend(0);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (chatId: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    await fetch(`/api/questions/${questionId}/messages/${chatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, message: editValue }),
    });
    setEditingId(null);
    setEditValue("");
    setIsSubmitting(false);
    fetchMessages();
  };

  const handleNiceFlag = async (chatId: number) => {
    await fetch(`/api/questions/${questionId}/messages/${chatId}/status`, { method: "PATCH" });
    fetchMessages();
  };

  const handleDeleteClick = async (chatId: number) => {
    if (!confirm("本当に削除しますか？")) return;
    await fetch(`/api/questions/${questionId}/messages/${chatId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: questionId }),
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

  return (
    <div ref={containerRef} className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-gray-50">
      {/* 1. 質問エリア */}
      {question && (
        <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] z-20">
          <details className="group relative w-full">
            <summary className="list-none flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50/80 transition-all">
              <div className="flex items-center gap-3 pl-0 lg:ml-32">
                <span className="shrink-0 bg-gradient-to-r from-blue-400 to-emerald-400 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase shadow-sm">QUESTION</span>
                <h1 className="text-[17px] font-bold text-gray-900 truncate">{question.title}</h1>
              </div>
              <ChevronDown className="w-5 h-5 text-gray-500 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <div className="bg-white border-b border-gray-200 shadow-xl opacity-0 group-open:opacity-100 max-h-0 group-open:max-h-[50vh] overflow-hidden transition-all duration-300">
              <div className="py-3 px-8 lg:px-32"><p className="text-[14px] text-gray-700 whitespace-pre-wrap">{question.question}</p></div>
            </div>
          </details>
        </div>
      )}

      {/* 2. チャットリスト */}
      <div className="flex-1 overflow-y-auto relative w-full p-4">
        <ChatList 
          messages={messages}
          spaceId={numericSpaceId}
          isSubmitting={isSubmitting}
          ref={scrollRef}
          onEdit={(id) => { setEditingId(id); setEditValue(messages.find((m: any) => m.id === id)?.message || ""); }}
          onDelete={handleDeleteClick}
          setEditValue={setEditValue}
          onNiceFlag={handleNiceFlag}
          onDownload={handleDownload}
          type="question"
        />
      </div>

      {/* 3. 編集通知エリア */}
      {editingId && (
        <div className="flex-shrink-0 px-4 pb-2">
          <div className="bg-blue-100 p-2 text-sm text-blue-800 rounded-lg flex justify-between">
            <span>編集モード中</span>
            <button onClick={() => { setEditingId(null); setEditValue(""); }}>キャンセル</button>
          </div>
        </div>
      )}

      {/* 4. 入力エリア */}
      <div className="flex-shrink-0 w-full">
        <ChatInput 
          value={editingId ? editValue : inputText}
          onChange={editingId ? setEditValue : setInputText} 
          onSend={() => editingId ? handleUpdate(editingId) : handleSend()}
          onSendStamp={(s) => handleSend(s)} 
          onUploadImage={handleFileSelect}
          onRemoveFile={handleRemoveFile}
          selectedFiles={selectedFiles}
          disabled={isSubmitting}
        />
      </div>
    </div>
  );
}