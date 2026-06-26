'use client';
import { useState, useEffect, useRef, use } from "react";
import ChatInput from "@/components/chat/ChatInput";
import ChatList from "@/components/chat/ChatList";
import { ChatMessage } from "@/types/chat";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Question } from "@/types/question";
import { ChevronDown, CheckCircle2 } from "lucide-react";
import { MESSAGES } from "@/constants/messages";
import { Switch } from "@nextui-org/react";

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
  const numericSpaceId = Number(spaceId);
  const { status } = useSession();
  const router = useRouter();
  // メッセージが更新されたら、一度だけ一番下に飛ぶ
  const isInitialLoad = useRef(true);

  // 質問の解決状態を管理する（0:未解決, 1:解決済み）
  const [isResolved, setIsResolved] = useState(0);

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
      toast.error(MESSAGES.USER001);
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (messages.length > 0 && isInitialLoad.current) {
      scrollToBottom(true);
      isInitialLoad.current = false; // 初回だけ実行するようにフラグを折る
    }
  }, [messages]); // messages が更新された（＝描画された）瞬間に実行される

  useEffect(() => {
    if (questionId) fetchMessages();
  }, [questionId]);

  const fetchMessages = async () => {
    setIsLoading(true); // 開始
    try {
      const res = await fetch(`/api/questions/${questionId}/messages`);
      const data = await res.json();
      setMessages(data.messages || []);
      setQuestion(data.question);
    } catch (error) {
      console.error("メッセージ取得エラー:", error);
    } finally {
      setIsLoading(false); // 終了
    }
  };

  const handleFileSelect = (input: File | File[]) => {
    const newFiles = Array.isArray(input) ? input : [input];
    if (selectedFiles.length + newFiles.length > 5) {
      toast.error(MESSAGES.E1007);
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

    // ★送信失敗時の復元用にバックアップ
    const backupInputText = inputText;
    const backupFiles = [...selectedFiles];

    // 1. 仮メッセージ（pending）を作成
    const now = new Date().toISOString();
    const pendingMessages: ChatMessage[] = [];

    if (stampId) {
      pendingMessages.push({ id: Date.now(), stamp: stampId, isPending: true, created_at: now } as ChatMessage);
    } else {
      if (selectedFiles.length > 0) {
        selectedFiles.forEach((file, i) => {
          pendingMessages.push({
            id: Date.now() + i,
            signedImageUrl: URL.createObjectURL(file), // 表示用URL
            isPending: true,
            created_at: now,
            message: inputText, // 画像と一緒に送るメッセージ
          } as ChatMessage);
        });
      } else {
        pendingMessages.push({ id: Date.now(), message: inputText, isPending: true, created_at: now } as ChatMessage);
      }
    }

    // 2. 楽観的更新
    setMessages((prev) => [...prev, ...pendingMessages]);
    scrollToBottom(false); // 賢いスクロール

    // 入力リセット
    if (!stampId) {
      setInputText("");
      setSelectedFiles([]);
    }
    setIsSubmitting(true);

    // 3. FormDataの構築
    const formData = new FormData();
    formData.append("questionId", questionId);
    formData.append("space_id", spaceId);
    if (stampId) {
      formData.append("stamp", stampId);
    } else {
      if (inputText.trim()) formData.append("message", inputText);
      selectedFiles.forEach((file) => formData.append("images", file));
    }

    try {
      const res = await fetch(`/api/questions/${questionId}/messages`, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "送信失敗");
      
      // 4. サーバーからのレスポンスで置き換え
      // ※ APIが新規メッセージの配列(data.newMessagesなど)を返す前提です
      const serverItems = Array.isArray(data.newMessages) ? [...data.newMessages] : [data.message];
      
      setMessages((prev) => prev.map((msg) => {
        if (msg.isPending) {
          const match = serverItems.shift();
          return match ? { ...msg, ...match, isPending: false } : msg;
        }
        return msg;
      }));

    } catch (e: any) {
      toast.error(e.message);
      
      // ★エラー時にバックアップから復元
      if (!stampId) {
        setInputText(backupInputText);
        setSelectedFiles(backupFiles);
      }
      setMessages((prev) => prev.filter((m) => !m.isPending));
      scrollToBottom(true); // エラー時は強制スクロール

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
      toast.error(e.message);

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
      toast.error(e.message);
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
      toast.error(e.message);
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

  const handleToggleResolved = async (isSelected: boolean) => {
    const previousStatus = isResolved;
    const newStatus = isSelected ? 1 : 0;

    // 1. 楽観的更新
    setIsResolved(newStatus);

    try {
      const res = await fetch(`/api/questions/${questionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          is_resolved: newStatus,
          space_id: spaceId 
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "ステータス更新失敗");
      }
      
      // 成功時は何もしなくてOK（setIsResolvedで既に更新済みのため）
    } catch (e: any) {
      toast.error(e.message);

      // 2. 失敗したら前の状態に戻す（Switchも自動的に元の位置に戻ります）
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
          isLoading={isLoading}
          type="question"
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