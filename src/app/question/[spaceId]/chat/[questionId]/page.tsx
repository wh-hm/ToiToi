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

    // 1. メッセージ内容が即座に見えるように「仮のメッセージ」を作成
    const tempId = Date.now();
    const tempMessage: any = {
      id: tempId,
      message: inputText || "",
      stamp: stampId || null,
      created_at: new Date().toISOString(),
      isPending: true, // 送信中であることを示すフラグがあると便利
      
    };

    // 2. 楽観的更新：即座に画面へ追加
    setMessages((prev) => [...prev, tempMessage]);
    setInputText("");
    setSelectedFiles([]);

    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append("questionId", questionId);
    formData.append("space_id", spaceId);
    if (inputText.trim()) formData.append("message", inputText);
    if (stampId) formData.append("stamp", stampId);
    selectedFiles.forEach((file) => formData.append("images", file));

    try {
      const res = await fetch(`/api/questions/${questionId}/messages`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("送信失敗");
      
      // 3. サーバーから正式なリストを取得し、仮データを置き換える
      await fetchMessages();
      setSend(0);
    } catch (e: any) {
      toast.error("送信に失敗しました");
      // 4. 失敗したら仮メッセージを削除
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (chatId: number) => {
    if (isSubmitting || !editValue.trim()) return;

    // 1. 更新前の状態を保存
    const previousMessages = [...messages];

    // 2. 楽観的更新：即座に画面を書き換える
    setMessages((prev) => 
      prev.map((msg) => 
        msg.id === chatId ? { ...msg, message: editValue } : msg
      )
    );
    // 3. UIを即座に閉じる
    setEditingId(null);
    setEditValue("");

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/questions/${questionId}/messages/${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, message: editValue }),
      });

      if (!res.ok) throw new Error("更新失敗");

      // 成功したら、サーバーから返された正式なデータでリストを更新するのが理想的です
      // API側が更新後のデータを返しているなら、以下の処理でより正確になります
      const updatedData = await res.json();
      setMessages((prev) => prev.map(m => m.id === chatId ? updatedData : m));

    } catch (e: any) {
      toast.error("更新に失敗しました");
      // 4. 失敗したら元の状態へロールバック
      setMessages(previousMessages);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNiceFlag = async (chatId: number) => {
    // 1. 更新前の状態を保存
    const previousMessages = [...messages];

    // 2. 楽観的更新：即座に「ナイス！」状態を反転させる
    // ※現在の状態と逆の状態（!current）にする前提です
    setMessages((prev) => 
      prev.map((msg) => 
        msg.id === chatId 
          ? { ...msg, nice_flag: msg.nice_flag === 1 ? 0 : 1 } // ★ここを修正！
          : msg
      )
    );

    try {
      const res = await fetch(`/api/questions/${questionId}/messages/${chatId}/status`, { 
        method: "PATCH" 
      });
      
      if (!res.ok) throw new Error("更新失敗");
      
    } catch (e: any) {
      toast.error("更新に失敗しました");
      // 3. 失敗したら元の状態に戻す
      setMessages(previousMessages);
    }
  };

  const handleDeleteClick = async (chatId: number) => {
    if (!confirm("本当に削除しますか？")) return;

    // 1. 削除前の状態を保存
    const previousMessages = [...messages];

    // 2. 楽観的更新：即座に画面から消す
    setMessages((prev) => prev.filter((msg) => msg.id !== chatId));

    try {
      const res = await fetch(`/api/questions/${questionId}/messages/${chatId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: questionId }),
      });

      if (!res.ok) throw new Error("削除失敗");

    } catch (e: any) {
      toast.error("削除に失敗しました");
      // 3. 失敗したら元の状態に戻す
      setMessages(previousMessages);
    }
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

  const scrollToBottom = () => {
  if (scrollRef.current) {
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }
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
          onScrollBottom={scrollToBottom}
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