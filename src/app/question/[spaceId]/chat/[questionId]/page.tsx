'use client';
import { useState, useEffect, useRef, use, useLayoutEffect } from "react";
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
  const [send, setSend] = useState(0)
  const [question, setQuestion] = useState<Question>();

  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. paramsからIDを取得 (await不要で直接取り出せます)
  const { questionId, spaceId } = use(params);
  const numericSpaceId = Number(spaceId);
  const isInitialMount = useRef(true); // 初回かどうかのフラグ
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: session, status } = useSession(); // セッション状態を取得
  const router = useRouter(); // ルーター取得

  // 1. 認証チェックと初期スクロールを統合した useEffect
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      toast.error("ログインが必要です");
      router.push("/login"); // 遷移先URL
      return;
    }
    
  }, [status, router]);

  useEffect(() => {
    if (messages.length > 0 && scrollRef.current && send===0) {
      // ここで直接高さを指定する
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      setSend(1);
    }
  }, [messages]);
  
  useEffect(() => {
    if (questionId) fetchMessages();
  }, [questionId]);



  const fetchMessages = async () => {
      
    try {
      // 2. ここで確定した questionId と spaceId を使う
      const res = await fetch(`/api/questions/${questionId}/messages`);
      
      if (!res.ok) throw new Error("通信エラー");
      
      const data = await res.json();
      setMessages(data.messages || []);
      setQuestion(data.question);
    } catch (error) {
      console.error("メッセージ取得エラー:", error);
    }
  };

    const handleSend = async (stampId?: string, fileData?: File) => {
      
    if (isSubmitting) return;
    
    if (!inputText.trim() && !stampId && !fileData) return;
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("questionId", questionId);
    formData.append("space_id", spaceId);
    if (inputText.trim()) formData.append("message", inputText);
    if (stampId) formData.append("stamp", stampId);
    if (fileData) formData.append("image", fileData);

    try {
      const res = await fetch(`/api/questions/${questionId}/messages`, { method: "POST", body: formData });
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

  const handleUpdate = async (chatId: number) => {
    if (!editingId) return;
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
    setIsSubmitting(true);
    await fetch(`/api/questions/${questionId}/messages/${chatId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
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

  return (
      
    <div ref={containerRef} className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-gray-50">
      
      
        {question && (
          // 1. 親要素の構成： detailsがはみ出さないように、全体に max-h などを設定しても良いですが、まずはシンプルに
          <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] relative w-full">
            <details className="group relative w-full">
              {/* 見出しエリア */}
              <summary className="list-none flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50/80 transition-all w-full bg-white z-30 relative">
                <div className="flex-1 flex items-center min-w-0"> 
                  <div className="flex items-center gap-3 pl-0 lg:ml-32">
                    <span className="shrink-0 bg-gradient-to-r from-blue-400 to-emerald-400 text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wider uppercase shadow-sm">
                      QUESTION
                    </span>
                    <h1 className="text-[17px] font-bold text-gray-900 leading-tight truncate">
                      {question.title}
                    </h1>
                  </div>
                </div>
                <div className="shrink-0 lg:mr-32 p-1 rounded-full hover:bg-gray-200 transition-colors">
                  <ChevronDown className="w-5 h-5 text-gray-500 transition-transform duration-300 group-open:rotate-180" />
                </div>
              </summary>

              {/* ★詳細部分の修正：absolute で浮かせつつ、背景白で透けを解消 */}
              <div className="absolute top-full left-0 w-full z-20 bg-white border-b border-gray-200 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] lg:px-32
                  overflow-hidden transition-all duration-300 ease-in-out opacity-0 group-open:opacity-100 max-h-0 group-open:max-h-[80vh]">
                <div className="py-3 px-8">
                  <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {question.question}
                  </p>
                </div>
              </div>
            </details>
          </div>
        )}
      <div className="flex-1 overflow-y-auto relative w-full">
        <ChatList 
          messages={messages}
          spaceId={numericSpaceId}
          isSubmitting={isSubmitting}
          ref={scrollRef}
          onEdit={(id) => {
            setEditingId(id);
            // 編集対象のメッセージを検索してセットする
            const msg = messages.find((m: any) => m.id === id);
            setEditValue(msg?.message || "");
          }}
          onDelete={handleDeleteClick}
          setEditValue={setEditValue}
          onNiceFlag={handleNiceFlag}
          type="question"

        />
      </div>

      {editingId && (
        <div className="flex-shrink-0 bg-blue-100 p-2 text-sm text-blue-800 px-4 flex justify-between">
          <span>編集モード中</span>
          <button onClick={() => { setEditingId(null); setEditValue(""); }}>キャンセル</button>
        </div>
      )}

      <div className="flex-shrink-0 w-full">
        <ChatInput 
          value={editingId ? editValue : inputText}
          onChange={editingId ? setEditValue : setInputText} 
          onSend={() => editingId ? handleUpdate(editingId) : handleSend()}
          onSendStamp={(s) => handleSend(s)} 
          onUploadImage={(f) => handleSend(undefined, f)}
        />
      </div>
    </div>

  );
}