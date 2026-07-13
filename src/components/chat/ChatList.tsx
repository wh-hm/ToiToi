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
  spaceId, 
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
  isError
}, ref) => {
  
  const [openItemId, setOpenItemId] = useState<number | null>(null);
  const [zoomData, setZoomData] = useState<{ url: string; caption: string; msg: ChatMessage } | null>(null);
  const currentZoomData = zoomData;
  const [showScrollButton, setShowScrollButton] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setShowScrollButton(scrollHeight - scrollTop - clientHeight > 200);
  };

  return (
    <div className="relative w-full h-full">
      <ScrollShadow 
        ref={ref}
        onScroll={handleScroll}
        hideScrollBar 
        offset={0}
        className="flex flex-col gap-6 p-4 w-full max-w-[600px] mx-auto h-full overflow-y-auto"
      >
        {isLoading ? (
          <Loading text="チャットを取得中"/>
          ) : !chats || chats.length === 0 || isError ? (
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
          
          (chats.map((chat) => (
          // chats.map((chat) => (
            <div key={`msg-${chat.id}`}>
            
              <ChatMessageItem
                message={chat}
                spaceId={spaceId}
                isSubmitting={isSubmitting}
                isOpen={openItemId === chat.id}
                onOpenChange={(open) => setOpenItemId(open ? chat.id : null)}
                onToggleFavorite={onToggleFavorite}
                onEdit={onEdit}
                onDelete={onDelete}
                onBackgroundChange={onBackgroundChange}
                setEditValue={setEditValue}
                onNiceFlag={onNiceFlag}
                onImageClick={(url) => setZoomData({ url, caption: chat.image?.caption || "",  msg: chat})}
                onDownload={(url) => onDownload(url, String(chat.id))}
                onScrollBottom={(force) => onScrollBottom(force)}
                type={type}
              />
            </div>
          ))
        ))}
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
            chatId={String(currentChat.id)}
          />
        );
      })()}
    </div>
  );
});

ChatList.displayName = "ChatList";
export default ChatList;