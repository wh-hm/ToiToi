"use client";
import { useState, forwardRef } from "react";
import { ChatMessage } from "@/types/chat";
import ChatMessageItem from "@/components/chat/ChatMessageItem";
import { ScrollShadow } from "@nextui-org/react";

interface ChatListProps {
  messages: ChatMessage[];
  spaceId: number;
  isSubmitting: boolean;
  onToggleFavorite?: (id: number, flag: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number, spaceId: number) => void;
  onBackgroundChange?: (id: number, color: number) => void;
  setEditValue: (val: string) => void;
  onNiceFlag?: (id: number, flag: number) => void;
  type: string;
}

// forwardRef を使用して外部から ref を受け取れるようにします
const ChatList = forwardRef<HTMLDivElement, ChatListProps>(({ 
  messages, 
  spaceId, 
  isSubmitting, 
  onToggleFavorite, 
  onEdit, 
  onDelete, 
  onBackgroundChange, 
  setEditValue ,
  onNiceFlag,
  type
}, ref) => {
  
  const [openItemId, setOpenItemId] = useState<number | null>(null);
  

  return (
    <ScrollShadow 
      ref={ref} // 渡された ref をここに紐付ける
      hideScrollBar 
      offset={0}
      className="flex flex-col gap-6 p-4 w-full max-w-[600px] mx-auto h-full overflow-y-auto"
    >
      {messages.map((message) => (
        <ChatMessageItem
          key={message.id}
          message={message}
          spaceId={spaceId}
          isSubmitting={isSubmitting}
          isOpen={openItemId === message.id}
          onOpenChange={(open) => setOpenItemId(open ? message.id : null)}
          onToggleFavorite={onToggleFavorite}
          onEdit={onEdit}
          onDelete={onDelete}
          onBackgroundChange={onBackgroundChange}
          setEditValue={setEditValue}
          onNiceFlag={onNiceFlag}
          type={type}
        />
      ))}
      {/* 下部の余白用div */}
      <div className="h-20 flex-shrink-0" />
    </ScrollShadow>
  );
});

ChatList.displayName = "ChatList";
export default ChatList;