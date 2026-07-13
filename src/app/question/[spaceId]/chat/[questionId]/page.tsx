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
import { MESSAGES } from "@/constants/messages";
import { Switch } from "@nextui-org/react";
import { fetchWithTimeout } from "@/lib/api";
import { handleApiResponse } from "@/lib/api-utils";
import { Celebration } from "@/components/CelebrationModal";

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
  const [ celebration, setCelebration] = useState(false);

  // useEffect で質問データを取得した際に、初期状態をセットする
  useEffect(() => {
    if (question) {
      setIsResolved(question.is_resolved || 0); // 質問データにあるフラグを反映
    }
  }, [question]);

  // 1. スクロール処理の強化（page.tsxと同じロジック）
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
      // Array.isArray(chats) で安全に配列かどうかを確認してから length を見る
    if (Array.isArray(messages) && messages.length > 0 && scrollRef.current && isInitialLoad.current) {
      scrollRef.current.scrollTo({ 
        top: scrollRef.current.scrollHeight, 
        behavior: 'instant' 
      });
      isInitialLoad.current = false;
    }
  }, [messages]);

  useEffect(() => {
  // 読み込み完了後にスクロールを実行する
  if (!isLoading && messages.length > 0 && isInitialLoad.current) {
    scrollToBottom(true);
    isInitialLoad.current = false;
  }
}, [messages, isLoading]);

  useEffect(() => {
    if (questionId) fetchMessages();
  }, [questionId]);

  const fetchMessages = async () => {
    setIsLoading(true); // 開始
    try {
      const { questionId, spaceId } = await params;
      const res = await fetchWithTimeout(`/api/questions/${spaceId}/messages?questionId=${questionId}`);
      const data = await res.json();
        console.log("data", data);
      if (!res.ok) {
        await handleApiResponse(res); // 内部のthrowを待つ
        throw new Error(); // 明示的にエラーを投げる
      }
      setMessages(data.chats || []);
      setQuestion(data.question);
      
    } catch (error) {
      console.error("メッセージ取得エラー:", error);
      setIsError(true);
      setIsSubmitting(true);

    } finally {
      setIsLoading(false); // 終了
    }
  };

  const handleFileSelect = (input: File | File[]) => {
    const newFiles = Array.isArray(input) ? input : [input];
    if (selectedFiles.length + newFiles.length > 5) {
      ToiToiNotification.error(MESSAGES.E1007);
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
            created_at: new Date().toISOString(), // 必須項目
            image: {
              caption: inputText
            }
          } as ChatMessage);
        });
      } else {
        pendingMessages.push({ id: Date.now(), message: inputText, isPending: true, created_at: now } as ChatMessage);
      }
    }
    // 2. 楽観的更新 (UIに即座に反映)
    setMessages((prev) => [...prev, ...pendingMessages]);
    scrollToBottom(false);

    // 入力リセット
    if (!stampId) {
      setInputText("");
      setSelectedFiles([]);
    }
    setIsSubmitting(true);

    // 3. FormDataの構築
    const formData = new FormData();
    formData.append("questionId", String(questionId)); // API側のバリデーション用に確実に含める
    
    if (stampId) {
      formData.append("stamp", stampId);
    } else {
      if (selectedFiles.length > 0) {
        // ★修正: 画像がある場合は message ではなく caption として送信
        if (inputText.trim()) formData.append("caption", inputText);
        selectedFiles.forEach((file) => formData.append("images", file));
      } else {
        // 画像がない場合は通常通り message として送信
        if (inputText.trim()) formData.append("message", inputText);
      }
    }

    try {
      const res = await fetchWithTimeout(`/api/questions/${spaceId}/messages`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        await handleApiResponse(res); // 内部のthrowを待つ
        throw new Error(); // 明示的にエラーを投げる
      }
      const confirmedData = data.chats || [];
    // ★サーバーから返ってきたデータが一つ以上ある場合
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
      // ★エラー時にバックアップから復元
      if (!stampId) {
        setInputText(backupInputText);
        setSelectedFiles(backupFiles);
      }
      // 楽観的更新で追加した仮メッセージを削除
      setMessages((prev) => prev.filter((m) => !m.isPending));
      scrollToBottom(true); // エラー時は下部へスクロール

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
    setEditingId(null);
    setEditValue("");
    setIsSubmitting(true);
    try {
      const res = await fetchWithTimeout(`/api/questions/${spaceId}/messages/${questionId}?chatId=${chatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: editValue }),
      });
      const data = await res.json();

      if (!res.ok) {
        await handleApiResponse(res); // 内部のthrowを待つ
        throw new Error(); // 明示的にエラーを投げる
      }
      setMessages((prev) => prev.map(m => m.id === chatId ? data.updatedChat : m));
    } catch (e: any) {
      setMessages(previousMessages);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNiceFlag = async (chatId: number) => {
    // 1. 更新前の状態を保存
    const previousMessages = [...messages];

    // 2. 楽観的更新：即座に「ナイス！」状態を反転させる
    // ※現在の状態と逆の状態（!cuWrrent）にする前提です
    setMessages((prev) => 
      prev.map((msg) => 
        msg.id === chatId 
          ? { ...msg, niceFlag: msg.niceFlag === 1 ? 0 : 1 } // ★ここを修正！
          : msg
      )
    );

    try {
      const res = await fetchWithTimeout(`/api/questions/${spaceId}/messages/${questionId}/status?chatId=${chatId}`, { 
        method: "PATCH" 
      });
      const data = await res.json();
      if (!res.ok) {
        await handleApiResponse(res); // 内部のthrowを待つ
        throw new Error(); // 明示的にエラーを投げる
      }
      setCelebration(true);
      
    } catch (e: any) {
      // 3. 失敗したら元の状態に戻す
      setMessages(previousMessages);
    }
  };

  const handleDeleteClick = async (chatId: number) => {

    // 1. 削除前の状態を保存
    const previousMessages = [...messages];

    // 2. 楽観的更新：即座に画面から消す
    setMessages((prev) => prev.filter((msg) => msg.id !== chatId));

    try {
      const res = await fetchWithTimeout(`/api/questions/${spaceId}/messages/${questionId}?chatId=${chatId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        await handleApiResponse(res); // 内部のthrowを待つ
        throw new Error(); // 明示的にエラーを投げる
      }

    } catch (e: any) {
      ToiToiNotification.error(e.message);
      // 3. 失敗したら元の状態に戻す
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

  // 1. まずレスポンスをクローンして、JSONかバイナリかを判別する準備をする
  const responseClone = res.clone();

  
  
  // 2. ステータスが OK でない場合は JSON としてメッセージを取り出す
  if (!res.ok) {
    await handleApiResponse(res); // 内部のthrowを待つ
    throw new Error(); // 明示的にエラーを投げる
  }

  // 3. OKなら、Blobとしてデータを取得
  const blob = await responseClone.blob();
  const url = window.URL.createObjectURL(blob);
  
  // 4. ファイル名をヘッダーから取得（Content-Disposition）
  const disposition = res.headers.get('Content-Disposition');
  const fileName = disposition?.split('filename=')[1]?.replace(/['"]/g, '') || 'download.png';
  
  const a = document.createElement("a");
  a.href = url;
  a.download = decodeURIComponent(fileName); // 日本語ファイル名対応
  
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};


  const handleToggleResolved = async (isSelected: boolean) => {
    const previousStatus = isResolved;
    const newStatus = isSelected ? 1 : 0;

    // 1. 楽観的更新
    setIsResolved(newStatus);
    if(newStatus === 0){
      ToiToiNotification.info("質問ステータスを「未解決」に変更しました。", "status-toggle-toast");
    }else{
      // お祝い演出します！
      Celebration("質問解決おめでとう！")
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
      const data = await res.json();

      if (!res.ok) {
        await handleApiResponse(res); // 内部のthrowを待つ
        throw new Error(); // 明示的にエラーを投げる
      }
      
      // 成功時は何もしなくてOK（setIsResolvedで既に更新済みのため）
    } catch (e: any) {
      setIsResolved(previousStatus); 
    }
  };

return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-gray-50">

      {/* 1. 質問エリア */}
      {question && (
        <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] z-20">
          <details className="group relative w-full">
<summary className="list-none flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50/80 transition-all">
  {/* 左側のタイトルエリア：min-w-0を入れてタイトルが長くなってもレイアウト崩れを防ぐ */}
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

  {/* 右側のコントロールエリア */}
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


{/* 詳細テキストエリア：タイトルの開始位置と揃えるためのパディング調整 */}
<div className="bg-white border-b border-gray-200 shadow-xl opacity-0 group-open:opacity-100 max-h-0 group-open:max-h-[50vh] overflow-hidden transition-all duration-300">
  <div className="py-3 px-8 lg:px-[176px]"> {/* ここを調整してタイトル位置と合わせる */}
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