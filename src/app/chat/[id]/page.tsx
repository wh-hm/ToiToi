"use client";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import ChatInput from "@/components/chat/ChatInput";
import ChatList from "@/components/chat/ChatList";
import { ChatMessage } from "@/types/chat";
import { MESSAGES } from "@/constants/messages";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [editValue, setEditValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [space_id, setspace_id] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { status } = useSession();
  const router = useRouter();
  // ★配列で管理に変更
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const isInitialLoad = useRef(true);
  const [isLoading, setIsLoading] = useState(true); // ★追加


  // useEffect(() => {
  //   if (messages.length > 0 && scrollRef.current) {
  //     scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  //   }
  // }, [messages]);

  useEffect(() => {
    if (status === "unauthenticated") {
      toast.error(MESSAGES.AUTH003);
      router.push("/");
    }
  }, [status, router]);




  // 初回ロード完了時に一度だけ実行
  useEffect(() => {
    if (messages.length > 0 && scrollRef.current && isInitialLoad.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'instant' });
      isInitialLoad.current = false;
    }
  }, [messages]);


  const scrollToBottom = (force: boolean = false) => {
  // 0ミリ秒の setTimeout で、React のレンダリングが終わるのを待つ
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
    setIsLoading(true); // 開始時にオン
    try {
      const { id } = await params;
      const res = await fetch(`/api/chats?space_id=${id}`);
      if (res.status === 404) {
      // 例: トップ画面か404専用ページに飛ばす。トースト等を出してもOK
        router.push('/404'); 
        return; // 処理をここで終了させる
      }
    if (!res.ok) {
      throw new Error("データの取得に失敗しました。");
    }

      const data = await res.json();
      setMessages(data);
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setIsLoading(false); // 完了したらオフ
    }
  };

  // ★画像追加処理：5枚制限
 const handleFileSelect = (input: File | File[]) => {
  const newFiles = Array.isArray(input) ? input : [input];
  const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

  // 1. まず枚数制限（全体に対して）
  if (selectedFiles.length + newFiles.length > 5) {
    toast.error(MESSAGES.E1007);
  }

  // 2. ファイルごとのバリデーション
  const validFiles: File[] = [];
  
  newFiles.forEach((file, index) => {
    // 現在の配列の長さ + これから追加する有効なファイル数 + 今回のループのインデックス
    const currentFileNumber = selectedFiles.length + validFiles.length + 1;
    
    // 枚数が上限を超えていたら中断
    if (selectedFiles.length + validFiles.length >= 5) return;

    // 形式チェック (仮に image/ かどうか)
    if (!file.type.startsWith('image/')) {
      toast.error(MESSAGES.E1005(currentFileNumber));
      return;
    }

    // サイズチェック
    if (file.size > MAX_SIZE_BYTES) {
      toast.error(MESSAGES.E1006(currentFileNumber));
      return;
    }

    validFiles.push(file);
  });

  // 3. 有効なファイルのみ追加
  if (validFiles.length > 0) {
    setSelectedFiles((prev) => [...prev, ...validFiles]);
  }
};

  // ★削除処理
  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (stampId?: string) => {
    if (isSubmitting) return;
    const { id } = await params;

    // ★送信失敗時の復元用にバックアップ
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

    setMessages((prev) => [...prev, ...pendingMessages]);
    scrollToBottom(false);
    console.log("ok")
    if (!stampId) {
      setInputText("");
      setSelectedFiles([]);
    }
    setIsSubmitting(true);

    
    try {
      const res = await fetch(`/api/chats/`, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "送信失敗");
      if (!data.newChat || data.newChat.length === 0) throw new Error("データが取得できませんでした");

      const serverItems = [...data.newChat];
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
      scrollToBottom(true);

    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (isSubmitting || !editingId || space_id === null) return;
    
    // 1. 保存前の状態を保存（失敗した時に戻すため）
    const previousMessages = [...messages];

    // 2. 楽観的更新：即座に画面上のメッセージを書き換える
    setMessages((prev) => 
      prev.map((msg) => 
        msg.id === editingId ? { ...msg, message: editValue } : msg
      )
    );
    
    // 3. 入力欄を閉じる（ユーザーには即座に反映されたように見える）
    setEditingId(null);
    setEditValue("");

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/chats/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: editValue, space_id: space_id }),
      });
      
      if (!res.ok) throw new Error("更新失敗");
      
    } catch (e: any) {
      toast.error(e.message);
      // 4. 失敗したら元の状態に戻す
      setMessages(previousMessages);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (chatId: number, sId: number) => {
    // 1. 削除前の状態をしっかり保存
    const previousMessages = [...messages];

    // 2. 楽観的更新：即座に画面から消す
    setMessages((prev) => prev.filter((msg) => msg.id !== chatId));

    try {
      const res = await fetch(`/api/chats/${chatId}?space_id=${sId}`, { 
        method: "DELETE" 
      });
      
      if (!res.ok) {
        // サーバー側でエラーが返った場合も catch へ飛ばす
        throw new Error("削除失敗");
      }
      
      // 成功した場合はここで終了（画面はすでに消えているので何もしなくていい）
    } catch (e: any) {
      toast.error(e.message)
      
      // ★重要：ここで確実に元のリストをセットし直す
      setMessages(previousMessages);
    }
  };

  const handleToggleFavorite = async (chatId: number, current: number) => {
    // 1. 更新前の状態を保存（失敗時用）
    const previousMessages = [...messages];

    // 2. 楽観的更新：即座に星のアイコンや表示を切り替える
    setMessages((prev) => 
      prev.map((msg) => 
        msg.id === chatId ? { ...msg, favorite_flag: current } : msg
      )
    );

    try {
      const res = await fetch(`/api/chats/${chatId}/favorite`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite_flag: current }),
      });

      if (!res.ok) throw new Error("API更新失敗");
      
    } catch (e: any) {
      toast.error(e.message);
      // 3. 失敗したら元の状態に戻す
      setMessages(previousMessages);
    }
  };

  const changeBackground = async (chatId: number, bg: number) => {
    // 1. 更新前の状態を保存
    const previousMessages = [...messages];

    // 2. 楽観的更新：即座に背景色を変更
    setMessages((prev) => 
      prev.map((msg) => 
        msg.id === chatId ? { ...msg, background: bg } : msg
      )
    );

    try {
      const res = await fetch(`/api/chats/${chatId}/background`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ background: bg }),
      });

      if (!res.ok) throw new Error("背景色更新失敗");
      
    } catch (e: any) {
      toast.error(e.message);

      // 3. 失敗したら元に戻す
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



  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-gray-50">
      <div className="flex-1 overflow-y-auto relative w-full">
        <ChatList 
          messages={messages}
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