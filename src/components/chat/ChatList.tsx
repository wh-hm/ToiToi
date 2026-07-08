"use client";
import { useState, forwardRef, useEffect } from "react";
import { ChatMessage } from "@/types/chat";
import ChatMessageItem from "@/components/chat/ChatMessageItem";
import { ScrollShadow } from "@nextui-org/react";
import { ImageZoomModal } from "./ImageZoomModal";
import { ArrowDown, MessageSquare } from "lucide-react";
import { Loading } from "@/components/LoadingSpinner";
import { ChatListProps } from "@/types/chat";

const ChatList = forwardRef<HTMLDivElement, ChatListProps>(({ 
  chats, 
  space_id, 
  isSubmitting, 
  onToggleFavorite, 
  onEdit, 
  onDelete, 
  onBackgroundChange, 
  setEditValue,
  onNiceFlag,
  onDownload,
  onScrollBottom,
  isLoading,
  type,
}, ref) => {
  
  const [openItemId, setOpenItemId] = useState<number | null>(null);
  const [zoomData, setZoomData] = useState<{ url: string; caption: string; msg: ChatMessage } | null>(null);
  const currentZoomData = zoomData;
  const [showScrollButton, setShowScrollButton] = useState(false);

  // 画像の読み込み状態
  const [isImagesLoading, setIsImagesLoading] = useState(false);

  // 💡 【ここが最大の修正点】
  // chatsが届いた後、または親のローディングが解除された後、
  // すべての「実際の画像オブジェクト」の読み込み完了を直接チェックします。
  // 画像の読み込み状態

  useEffect(() => {
    if (isLoading || chats.length === 0) {
      setIsImagesLoading(false);
      return;
    }

    const targetImages = chats.filter(chat => !chat.isPending && chat.signedImageUrl);
    
    if (targetImages.length === 0) {
      setIsImagesLoading(false);
      return;
    }

    setIsImagesLoading(true);

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const promises = targetImages.map((chat) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        
        // 💡 404エラーになるAPIルート経由ではなく、
        // もしすでにURLがあるならそれを直接、なければ組み立てる形に合わせる
        // （ここでは、ログに出ている不正なkeyの組み立てを回避するため、直URLか検証します）
        let srcUrl = chat.signedImageUrl!;
        if (!srcUrl.startsWith('http')) {
          srcUrl = `/api/images/view?key=${srcUrl}`;
        }
        
        img.src = srcUrl;
        
        if (img.complete) {
          resolve();
        } else {
          // 💡 ロード成功時はもちろん、404エラー（onerror）が起きても必ず即時 resolve() して次に進める！
          img.onload = () => resolve();
          img.onerror = () => {
            console.warn("画像の読み込みに失敗したため、スキップします:", srcUrl);
            resolve(); 
          };
        }
      });
    });

    // 💡 どんなに画像が壊れていても、最大「1.5秒」経ったら強制的にローディングを終わらせる安全タイマー
    timeoutId = setTimeout(() => {
      if (isMounted) {
        console.log("画像ロードがタイムアウトしたため、強制解除します");
        setIsImagesLoading(false);
      }
    }, 1500);

    Promise.all(promises).then(() => {
      if (isMounted) {
        setIsImagesLoading(false);
        clearTimeout(timeoutId); // 正常に終わったらタイマー解除
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [chats, isLoading]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setShowScrollButton(scrollHeight - scrollTop - clientHeight > 200);
  };

  // 親の読み込み、または画像の裏側読み込み、どちらかが動いていればローディングを表示
  const shouldShowLoading = isLoading || isImagesLoading;

  return (
    <div className="relative w-full h-full">
      <ScrollShadow 
        ref={ref}
        onScroll={handleScroll}
        hideScrollBar 
        offset={0}
        className="flex flex-col gap-6 p-4 w-full max-w-[600px] mx-auto h-full overflow-y-auto"
      >
        {shouldShowLoading ? (
          <Loading text="チャットを取得中"/>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-400">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <MessageSquare size={32} className="text-gray-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-700 mb-2">対話を開始しましょう！</h2>
            <p className="text-sm max-w-xs text-gray-500 leading-relaxed">
              {type === "chat" ? (
                <>何気ない挨拶や共有でも、気軽に投稿してくださいね。</>
              ) : (
                <>
                  気になることを教えてください。<br />
                  最初のメッセージが、この質問を解決するための第一歩になります。
                </>
              )}
            </p>
          </div>
        ) : (
          chats.map((chat) => (
            <div key={`msg-${chat.id}`}>
              <ChatMessageItem
                message={chat}
                space_id={space_id}
                isSubmitting={isSubmitting}
                isOpen={openItemId === chat.id}
                onOpenChange={(open) => setOpenItemId(open ? chat.id : null)}
                onToggleFavorite={onToggleFavorite}
                onEdit={onEdit}
                onDelete={onDelete}
                onBackgroundChange={onBackgroundChange}
                setEditValue={setEditValue}
                onNiceFlag={onNiceFlag}
                onImageClick={(url) => setZoomData({ url, caption: chat.message || "",  msg: chat})}
                onDownload={(url) => onDownload(url, String(chat.id))}
                onScrollBottom={(force) => onScrollBottom(force)}
                type={type}
              />
            </div>
          ))
        )}
        <div className="h-20 flex-shrink-0" />
      </ScrollShadow>

      {/* スクロールボタン */}
      {showScrollButton && (
        <button 
          onClick={() => onScrollBottom(true)}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 p-3 px-6 bg-white border border-gray-200 rounded-full shadow-lg hover:bg-gray-50 transition-all z-50 animate-in fade-in duration-300 flex items-center gap-2 whitespace-nowrap"
        >
          <ArrowDown size={20} className="text-gray-600" />
          <span className="text-sm font-bold text-gray-700">最新のメッセージへ</span>
        </button>
      )}

      {currentZoomData && (() => {
        const currentChat = chats.find((c) => 
          c.id === currentZoomData.msg.id || 
          (c.signedImageUrl && c.signedImageUrl === currentZoomData.url)
        ) || currentZoomData.msg;

        return (
          <ImageZoomModal 
            isOpen={!!currentZoomData} 
            onClose={() => setZoomData(null)} 
            imageUrl={currentZoomData.url} 
            caption={currentZoomData.caption}
            onDownload={onDownload}
            msg={currentChat} 
            isPending={currentChat.isPending} 
            chat_id={String(currentZoomData.msg.id)}
          />
        );
      })()}
    </div>
  );
});

ChatList.displayName = "ChatList";
export default ChatList;