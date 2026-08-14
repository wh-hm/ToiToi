'use client';
//修正中
import { useState, useEffect, useRef, use } from "react";
import ChatInput from "@/components/chat/ChatInput";
import ChatList from "@/components/chat/ChatList";
import { ChatMessage } from "@/types/chat";
import { ToiToiNotification } from "@/components/Toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Question } from "@/types/question";
import { ChevronDown, CheckCircle2 } from "lucide-react";
import { Switch } from "@nextui-org/react";
import { fetchWithTimeout } from "@/lib/api";
import { handleApiResponse } from "@/lib/api-utils";
import { Celebration, useCelebration } from "@/components/Celebration";
import { MESSAGES } from "@/constants/messages";

export default function ChatPage({ params }: { params: Promise<{ questionId: string, spaceId: string }> }) {
  const [inputText, setInputText] = useState("");
  const [editValue, setEditValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState<Question>();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { questionId, spaceId } = use(params);
  const numericspaceId = Number(spaceId);
  const { status } = useSession();
  const router = useRouter();
  const isInitialLoad = useRef(true);
  
  // 質問の解決状態を管理する（0:未解決, 1:解決済み）
  const [isResolved, setIsResolved] = useState(0);
  const [isError, setIsError] = useState(false);

  // ★ Celebration用のStateを追加
  const [isCelebrationShow, setIsCelebrationShow] = useState(false);
  const [celebrationOpacity, setCelebrationOpacity] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);

  // ★ お祝い演出をトリガーする関数
  const triggerCelebration = (msg: string) => {
    setCelebrationMessage(msg);
    setIsCelebrationShow(true);
    setTimeout(() => setCelebrationOpacity(true), 50);

    // 3秒後に自動で非表示にする
    setTimeout(() => {
      setCelebrationOpacity(false);
      setTimeout(() => setIsCelebrationShow(false), 500);
    }, 3000);
  };

  // useEffect で質問データを取得した際に、初期状態をセットする
  useEffect(() => {
    if (question) {
      setIsResolved(question.is_resolved || 0);
    }
  }, [question]);

  const scrollToBottom = (force: boolean = false) => {
    setTimeout(() => {
      if (!scrollRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = (scrollHeight - scrollTop - clientHeight < 200);
      if (isNearBottom || force) {
        scrollRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' });
      }
    }, 0);
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      ToiToiNotification.error(MESSAGES.E4003);
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (Array.isArray(messages) && messages.length > 0 && scrollRef.current && isInitialLoad.current) {
      scrollRef.current.scrollTo({ 
        top: scrollRef.current.scrollHeight, 
        behavior: 'instant' 
      });
      isInitialLoad.current = false;
    }
  }, [messages]);

  useEffect(() => {
    if (!isLoading && messages.length > 0 && isInitialLoad.current) {
      scrollToBottom(true);
      isInitialLoad.current = false;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (questionId) fetchMessages();
  }, [questionId]);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const { questionId, spaceId } = await params;
      const res = await fetchWithTimeout(`/api/questions/${spaceId}/messages?questionId=${questionId}`);
      if (!res.ok) {
        await handleApiResponse(res);
        throw new Error();
      }
      const data = await res.json();
      setMessages(data.chats || []);
      setQuestion(data.question);
    } catch (error) {
      console.error("メッセージ取得エラー:", error);
      setIsError(true);
      setIsSubmitting(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (input: File | File[]) => {
    const newFiles = Array.isArray(input) ? input : [input];
    if (selectedFiles.length + newFiles.length > 5) {
      ToiToiNotification.error("ファイルは最大5つまでです");
      return;
    }
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (stampId?: string) => {
    if (isSubmitting) return;
    if (!stampId && !inputText.trim() && selectedFiles.length === 0) return;
    const backupInputText = inputText;
    const backupFiles = [...selectedFiles];
    const now = new Date().toISOString();
    const pendingMessages: ChatMessage[] = [];

    if (stampId) {
      pendingMessages.push({ id: Date.now(), stamp: stampId, isPending: true, created_at: now } as ChatMessage);
    } else {
      if (selectedFiles.length > 0) {
        selectedFiles.forEach((file, i) => {
          pendingMessages.push({
            id: Date.now() + i,
            signedImageUrl: URL.createObjectURL(file),
            isPending: true,
            created_at: new Date().toISOString(),
            image: { caption: inputText }
          } as ChatMessage);
        });
      } else {
        pendingMessages.push({ id: Date.now(), message: inputText, isPending: true, created_at: now } as ChatMessage);
      }
    }
    
    setMessages((prev) => [...prev, ...pendingMessages]);
    scrollToBottom(false);

    if (!stampId) {
      setInputText("");
      setSelectedFiles([]);
    }
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("questionId", String(questionId));
    
    if (stampId) {
      formData.append("stamp", stampId);
    } else {
      if (selectedFiles.length > 0) {
        if (inputText.trim()) formData.append("caption", inputText);
        selectedFiles.forEach((file) => formData.append("images", file));
      } else {
        if (inputText.trim()) formData.append("message", inputText);
      }
    }

    try {
      const res = await fetchWithTimeout(`/api/questions/${spaceId}/messages`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        await handleApiResponse(res);
        throw new Error();
      }
      const confirmedData = data.chats || [];
      if (data.chats && Array.isArray(data.chats)) {
        setMessages((prev) => {
          return prev.map(msg => {
            if (msg.isPending) {
              const match = confirmedData.shift();
              if (!match) return msg;
              return { 
                ...msg, 
                ...match, 
                isPending: false,
                image: match.image || null 
              };
            }
            return msg;
          });
        });
      }
    } catch (e: any) {
      console.error(e);
      if (!stampId) {
        setInputText(backupInputText);
        setSelectedFiles(backupFiles);
      }
      setMessages((prev) => prev.filter((m) => !m.isPending));
      scrollToBottom(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (chatId: number) => {
    if (isSubmitting || !editValue.trim()) return;
    const previousMessages = [...messages];

    setMessages((prev) => 
      prev.map((msg) => 
        msg.id === chatId ? { ...msg, message: editValue } : msg
      )
    );
    setEditingId(null);
    setEditValue("");
    setIsSubmitting(true);
    try {
      const res = await fetchWithTimeout(`/api/questions/${spaceId}/messages/${questionId}?chatId=${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: editValue }),
      });

      if (!res.ok) {
        await handleApiResponse(res);
        throw new Error();
      }
      const data = await res.json();

      setMessages((prev) => prev.map(m => m.id === chatId ? data.updatedChat : m));
    } catch (e: any) {
      setMessages(previousMessages);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNiceFlag = async (chatId: number) => {
    const previousMessages = [...messages];

    setMessages((prev) => 
      prev.map((msg) => 
        msg.id === chatId 
          ? { ...msg, niceFlag: msg.niceFlag === 1 ? 0 : 1 } 
          : msg
      )
    );

    try {
      const res = await fetchWithTimeout(`/api/questions/${spaceId}/messages/${questionId}/status?chatId=${chatId}`, { 
        method: "PATCH" 
      });
      if (!res.ok) {
        await handleApiResponse(res);
        throw new Error();
      }
    } catch (e: any) {
      setMessages(previousMessages);
    }
  };

  const handleDeleteClick = async (chatId: number) => {
    const previousMessages = [...messages];
    setMessages((prev) => prev.filter((msg) => msg.id !== chatId));

    try {
      const res = await fetchWithTimeout(`/api/questions/${spaceId}/messages/${questionId}?chatId=${chatId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        await handleApiResponse(res);
        throw new Error();
      }
    } catch (e: any) {
      ToiToiNotification.error(e.message);
      setMessages(previousMessages);
    }
  };

  const handleDownload = async (imageUrl: string, chatId: string) => {
    const res = await fetchWithTimeout("/api/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        targetUrl: imageUrl,
        spaceId: spaceId,
        type: "question",
        questionId: questionId,
        chatId: chatId 
      })
    });


    if (!res.ok) {
      await handleApiResponse(res);
      throw new Error();
    }
    const responseClone = res.clone();


    const blob = await responseClone.blob();
    const url = window.URL.createObjectURL(blob);
    const disposition = res.headers.get('Content-Disposition');
    const fileName = disposition?.split('filename=')[1]?.replace(/['"]/g, '') || 'download.png';
    
    const a = document.createElement("a");
    a.href = url;
    a.download = decodeURIComponent(fileName);
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleToggleResolved = async (isSelected: boolean) => {
    const previousStatus = isResolved;
    const newStatus = isSelected ? 1 : 0;

    setIsResolved(newStatus);
    if(newStatus === 0){
      ToiToiNotification.info("質問ステータスを「未解決」に変更しました。", "status-toggle-toast");
    }else{
      // ★ ここでお祝い演出を呼び出し！
      triggerCelebration("質問解決おめでとう！");
    }

    try {
      const res = await fetchWithTimeout(`/api/questions/${spaceId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          isResolved: newStatus,
          questionId: questionId 
        }),
      });

      if (!res.ok) {
        await handleApiResponse(res);
        throw new Error();
      }
    } catch (e: any) {
      setIsResolved(previousStatus); 
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-gray-50 relative">

      {/* ★ お祝い演出コンポーネントを配置 */}
      <Celebration 
        show={isCelebrationShow} 
        opacity={celebrationOpacity} 
        message={celebrationMessage} 
      />

      {/* 1. 質問エリア */}
      {question && (
        <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] z-20">
          <details className="group relative w-full">
            <summary className="list-none flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50/80 transition-all">
              <div className="flex items-center gap-3 pl-0 lg:ml-32 min-w-0">
                <div 
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-default ${
                    isResolved === 1 
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                      : "bg-gray-100 text-gray-500 border-gray-200"
                  }`}
                >
                  <CheckCircle2 size={12} />
                  {isResolved === 1 ? "解決済み" : "未解決"}
                </div>
                <h1 className="text-[17px] font-bold text-gray-900 truncate">{question.title}</h1>
              </div>

              <div className="flex items-center gap-4 mr-2 lg:mr-32">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-gray-600">解決</span>
                  <Switch 
                    isSelected={isResolved === 1}
                    onValueChange={handleToggleResolved}
                    size="sm"
                    color="success"
                  />
                </div>
                <ChevronDown className="w-5 h-5 text-gray-500 transition-transform duration-300 group-open:rotate-180" />
              </div>
            </summary>

            <div className="bg-white border-b border-gray-200 shadow-xl opacity-0 group-open:opacity-100 max-h-0 group-open:max-h-[50vh] overflow-hidden transition-all duration-300">
              <div className="py-3 px-8 lg:px-[176px]">
                <p className="text-[14px] text-gray-700 whitespace-pre-wrap">{question.question}</p>
              </div>
            </div>
          </details>
        </div>
      )}
      <div className="flex-1 overflow-y-auto relative w-full p-4">
        <ChatList 
          chats={messages}
          spaceId={numericspaceId}
          isSubmitting={isSubmitting}
          ref={scrollRef}
          onEdit={(id) => { setEditingId(id); setEditValue(messages.find((m: any) => m.id === id)?.message || ""); }}
          onDelete={handleDeleteClick}
          setEditValue={setEditValue}
          onNiceFlag={handleNiceFlag}
          onDownload={handleDownload}
          onScrollBottom={scrollToBottom}
          isLoading={isLoading}
          type="question"
          isError={isError}
        />
      </div>

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