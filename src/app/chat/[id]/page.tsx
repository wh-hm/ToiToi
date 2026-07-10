"use client";
import { useState, useEffect, useRef } from "react";
import { ToiToiNotification } from "@/components/Toast";
import ChatInput from "@/components/chat/ChatInput";
import ChatList from "@/components/chat/ChatList";
import { ChatMessage } from "@/types/chat";
import { MESSAGES } from "@/constants/messages";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { fetchWithTimeout } from "@/lib/api";
import { handleApiResponse } from "@/lib/api-utils";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [editValue, setEditValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [space_id, setspace_id] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { status } = useSession();
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const isInitialLoad = useRef(true);
  const [isLoading, setIsLoading] = useState(true); 
  const [spaceName, setSpaceName] = useState("");
  const [isChatsLoadFailed, setIsChatsLoadFailed] = useState(true);
  const [ isError, setIsError] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      ToiToiNotification.error(MESSAGES.E4003);
      router.push("/");
    }
  }, [status, router]);

  // 初回ロード完了時に一度だけ実行
  // useEffect(() => {
    
  //   if (chats.length > 0 && scrollRef.current && isInitialLoad.current) {
  //     scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'instant' });
  //     isInitialLoad.current = false;
  //   }
  // }, [chats]);
  // 修正後
  useEffect(() => {
    // Array.isArray(chats) で安全に配列かどうかを確認してから length を見る
    if (Array.isArray(chats) && chats.length > 0 && scrollRef.current && isInitialLoad.current) {
      scrollRef.current.scrollTo({ 
        top: scrollRef.current.scrollHeight, 
        behavior: 'instant' 
      });
      isInitialLoad.current = false;
    }
  }, [chats]);

  const scrollToBottom = (force: boolean = false) => {
    setTimeout(() => {
      if (!scrollRef.current || editingId !== null) return;
      

      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = (scrollHeight - scrollTop - clientHeight < 200);

      if (isNearBottom || force) {
        scrollRef.current.scrollTo({ 
          top: scrollHeight, 
          behavior: 'smooth' 
        });
      }
    }, 0);
  };

  useEffect(() => {
    params.then((p) => setspace_id(Number(p.id)));
  }, [params]);

  useEffect(() => { fetchMessages(); }, []);

  const fetchMessages = async () => {
    setIsLoading(true); 
    setIsChatsLoadFailed(true); // 読み込み開始時は一旦Failed扱いにしておく
    try {
      const { id } = await params;
      const res = await fetchWithTimeout(`/api/chats?space_id=${id}`);
      const data = await res.json();
      if (!res.ok) {
        await handleApiResponse(res); // 内部のthrowを待つ
        throw new Error(); // 明示的にエラーを投げる
      }

      // 💡 【修正点】まずデータを画面にセットして、Failedフラグを解除
      setChats(data.chats);
      setSpaceName(data.spaceName);
      setIsChatsLoadFailed(false);
      setIsError(false);
      
    } catch (e) {
      console.error("メッセージ取得エラー:", e);
      console.error("API Error at /api/chats:", e);
      setIsError(true);
      ToiToiNotification.error("チャットの取得に失敗しました。");
    } finally {
      // 💡 【超重要】ここで一律でfalseにするのではなく、
      // データのマウントが終わったので isLoading を解除。
      // これにより、ChatList内部の「画像ロード監視（isImagesLoading）」へバトンが綺麗に渡ります！
      setIsLoading(false); 
    }
  };

  // ファイル選択処理
  const handleFileSelect = (input: File | File[]) => {
    const newFiles = Array.isArray(input) ? input : [input];
    const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

    if (selectedFiles.length + newFiles.length > 5) {
      ToiToiNotification.error(MESSAGES.E1007);
    }

    const validFiles: File[] = [];
    
    newFiles.forEach((file) => {
      const currentFileNumber = selectedFiles.length + validFiles.length + 1;
      
      if (selectedFiles.length + validFiles.length >= 5) return;

      if (!file.type.startsWith('image/')) {
        ToiToiNotification.error(MESSAGES.E1005(currentFileNumber));
        return;
      }

      if (file.size === 0) {
        ToiToiNotification.error(MESSAGES.E1012(currentFileNumber));
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        ToiToiNotification.error(MESSAGES.E1006(currentFileNumber));
        return;
      }

      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (stampId?: string) => {
    if (isSubmitting) return;
    const { id } = await params;

    const backupInputText = inputText;
    const backupFiles = [...selectedFiles];

    const formData = new FormData();
    formData.append("space_id", id);

    if (stampId) {
      formData.append("stamp", stampId);
    } else {
      if (inputText.trim()) formData.append("message", inputText);
      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });
    }

    const pendingMessages: ChatMessage[] = [];
    const now = new Date().toISOString();

    if (stampId) {
      pendingMessages.push({ id: Date.now(), stamp: stampId, isPending: true, created_at: now } as ChatMessage);
    } else {
      if (selectedFiles.length > 0) {
        selectedFiles.forEach((file, i) => {
          pendingMessages.push({
            id: Date.now() + i,
            signedImageUrl: URL.createObjectURL(file),
            isPending: true,
            created_at: now,
            message: inputText,
          } as ChatMessage);
        });
      } else {
        pendingMessages.push({ id: Date.now(), message: inputText, isPending: true, created_at: now } as ChatMessage);
      }
    }

    setChats((prev) => {
      // prev が配列であることを確認し、そうでなければ空配列として扱う
      const safePrev = Array.isArray(prev) ? prev : [];
      return [...safePrev, ...pendingMessages];
    });

    // setChats((prev) => [...prev, ...pendingMessages]);
    scrollToBottom(false);

    if (!stampId) {
      setInputText("");
      setSelectedFiles([]);
    }
    setIsSubmitting(true);

    try {
      const res = await fetchWithTimeout(`/api/chats/`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        await handleApiResponse(res); // 内部のthrowを待つ
        throw new Error(); // 明示的にエラーを投げる
      }

      if (data.newChat && data.newChat.length > 0){
        const serverItems = [...data.newChat];
        setChats((prev) => prev.map((msg) => {
          if (msg.isPending) {
            const match = serverItems.shift();
            return match ? { ...msg, ...match, isPending: false } : msg;
          }
          return msg;
        }));
      }
    } catch (e) {
      console.log(e);
      if (!stampId) {
        setInputText(backupInputText);
        setSelectedFiles(backupFiles);
      }
      setChats((prev) => prev.filter((m) => !m.isPending));
      scrollToBottom(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (isSubmitting || !editingId || space_id === null) return;
    
    const previousMessages = [...chats];

    setChats((prev) => 
      prev.map((msg) => 
        msg.id === editingId ? { ...msg, message: editValue } : msg
      )
    );
    
    setEditingId(null);
    setEditValue("");
    setIsSubmitting(true);

    try {
      const res = await fetchWithTimeout(`/api/chats/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: editValue, space_id: space_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        await handleApiResponse(res); // 内部のthrowを待つ
        throw new Error(); // 明示的にエラーを投げる
      }
      
    } catch (e) {
      console.log(e);
      setChats(previousMessages);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (chatId: number, sId: number) => {
    const previousMessages = [...chats];
    setChats((prev) => prev.filter((msg) => msg.id !== chatId));

    try {
      const res = await fetchWithTimeout(`/api/chats/${chatId}?space_id=${sId}`, { 
        method: "DELETE" 
      });
      const data = await res.json();
      if (!res.ok) {
        await handleApiResponse(res); // 内部のthrowを待つ
        throw new Error(); // 明示的にエラーを投げる
      }(res);
    } catch (e) {
      console.log(e);
      setChats(previousMessages);
    }
  };

  const handleToggleFavorite = async (chatId: number, current: number) => {
    const previousMessages = [...chats];

    setChats((prev) => 
      prev.map((msg) => 
        msg.id === chatId ? { ...msg, favorite_flag: current } : msg
      )
    );

    try {
      const res = await fetchWithTimeout(`/api/chats/${space_id}/favorite`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          favorite_flag: current,
          chat_id: chatId
        }),
      });
      const data = await res.json();


      if (!res.ok) {
        await handleApiResponse(res); // 内部のthrowを待つ
        throw new Error(); // 明示的にエラーを投げる
      }
    } catch (e) {
      console.log(e);
      setChats(previousMessages);
    }
  };

  const changeBackground = async (chat_id: number, bg: number) => {
    const previousMessages = [...chats];

    setChats((prev) => 
      prev.map((msg) => 
        msg.id === chat_id ? { ...msg, background: bg } : msg
      )
    );

    try {
      const res = await fetchWithTimeout(`/api/chats/${space_id}/background`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ background: bg, chat_id: chat_id }),
      });
      const data = await res.json();

      if (!res.ok) {
        await handleApiResponse(res); // 内部のthrowを待つ
        throw new Error(); // 明示的にエラーを投げる
      };
    } catch (e) {
      console.log(e);
      setChats(previousMessages);
    }
  };

  const handleDownload = async (imageUrl: string, chat_id: string) => {
    try {
      const res = await fetchWithTimeout("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          targetUrl: imageUrl,
          space_id: space_id,
          type: "chat",
          chat_id: chat_id 
        })
      });


      if (!res.ok) {
        await handleApiResponse(res); // 内部のthrowを待つ
        throw new Error(); // 明示的にエラーを投げる
      };

      // 💡 成功ならそのまま安全にBlob変換
      const blob = await res.blob();
      
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
    } catch (error) {
      console.error(error);
      ToiToiNotification.error("ダウンロード中にエラーが発生しました。");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-gray-50">
      {chats && (
        <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-20 w-full ">
          <div className="flex items-center h-14 px-4 pl-8 md:p-0 max-w-2xl xl:max-w-5xl md:m-auto">
            <div className="flex items-center gap-2 min-w-0">
              <svg 
                className="w-4 h-4 text-gray-400 flex-shrink-0" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h2 className="text-base font-semibold text-gray-800 truncate tracking-wide flex items-center gap-1">
                <span className="text-gray-400 text-sm font-normal">スペース名:</span>
                <span>{isLoading ? "読み込み中..." : spaceName}</span>
              </h2>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto relative w-full">
        <ChatList 
          chats={chats}
          space_id={space_id || 0}
          isSubmitting={isSubmitting}
          ref={scrollRef}
          onToggleFavorite={handleToggleFavorite}
          onEdit={setEditingId}
          onDelete={handleDeleteClick}
          onBackgroundChange={changeBackground}
          setEditValue={setEditValue}
          onDownload={handleDownload}
          onScrollBottom={scrollToBottom}
          isLoading={isLoading}
          type="chat"
          isError={isError}
        />
      </div>

      {editingId && (
        <div className="flex-shrink-0 bg-blue-100 p-2 text-sm text-blue-800 px-4">
          編集モード中
        </div>
      )}

      <div className="flex-shrink-0 w-full">
        <ChatInput 
          value={editingId ? editValue : inputText}
          onChange={editingId ? setEditValue : setInputText} 
          onSend={editingId ? handleUpdate : () => handleSend()}
          onSendStamp={(s) => handleSend(s)} 
          onUploadImage={handleFileSelect}
          onRemoveFile={handleRemoveFile} 
          selectedFiles={selectedFiles}   
          disabled={isSubmitting || isChatsLoadFailed || isError}
        />
      </div>
    </div>
  );
}