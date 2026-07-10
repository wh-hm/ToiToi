import { useState, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@nextui-org/react";
import { Star, ThumbsUp } from "lucide-react";
import { ChatMessage, CHAT_COLOR_PALETTE } from "@/types/chat";
import { formatDateTime } from "@/lib/formData";
import { ChatMessageItemProps } from "@/types/chat";


export default function ChatMessageItem({ 
  message, spaceId, isOpen, isSubmitting, 
  onOpenChange, onToggleFavorite, onEdit, onDelete, onBackgroundChange, setEditValue, onNiceFlag, onImageClick, onDownload, onScrollBottom, type
}: ChatMessageItemProps) {
  
  const [isHovered, setIsHovered] = useState(false);
  const [placement, setPlacement] = useState<"top-end" | "bottom-end">("bottom-end");
  const [isStampError, setIsStampError] = useState(false);
  const [imageErrors, setImageErrors] = useState(false);

  const targetRef = useRef<HTMLDivElement>(null);
  
  const offsetValue = placement === "bottom-end" ? 100 : 10;
  
  const isOnlyStamp = message.stamp && !message.message;
  const backgroundColor = CHAT_COLOR_PALETTE[message.background as keyof typeof CHAT_COLOR_PALETTE] || "white";

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isSubmitting) return;
    
    e.preventDefault();
    if (window.getSelection()?.toString()) return;
    if (e.ctrlKey || e.metaKey) return;

    if (targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      const shouldOpenUp = rect.top > window.innerHeight / 2;
      setPlacement(shouldOpenUp ? "top-end" : "bottom-end");
    }
    onOpenChange(true);
  };

  const hasImage = !!(message.signedImageUrl || (message as any).previewImages || message.imageUrl);

  return (
    <div className="relative flex flex-col items-end w-full">
      <Popover 
        placement={placement}
        offset={offsetValue}
        isOpen={isOpen && !isSubmitting}
        onOpenChange={onOpenChange}
        triggerRef={targetRef as React.RefObject<HTMLElement>}
        shouldCloseOnInteractOutside={() => true}
        isKeyboardDismissDisabled={true}
      >
        <PopoverTrigger>
          <div className="w-0 h-0" />
        </PopoverTrigger>
        
        <PopoverContent className="w-[200px] p-2 data-[placement=bottom-end]:mt-2 data-[placement=top-end]:mb-2">
          <div className="flex flex-col w-full">
            {!isOnlyStamp && !hasImage && message.message && (
              <button 
                disabled={isSubmitting}
                onClick={() => { 
                  onOpenChange(false); 
                  setEditValue(message.message || ""); 
                  onEdit(message.id); 
                }} 
                className="w-full text-left p-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >編集</button>
            )}
            <button 
              disabled={isSubmitting}
              onClick={() => { onOpenChange(false); onDelete(message.id, spaceId); }} 
              className="w-full text-left p-3 text-sm text-red-500 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >削除</button>
            {type === "chat" && (
              <button 
                disabled={isSubmitting}
                onClick={() => { onOpenChange(false); onToggleFavorite?.(message.id, message.favoriteFlag === 1 ? 0 : 1); }} 
                className="w-full text-left p-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >{message.favoriteFlag === 1 ? "お気に入り解除" : "お気に入り登録"}</button>
            )}
            {type === "question" && (
              <button 
                disabled={isSubmitting}
                onClick={() => { onOpenChange(false); onNiceFlag?.(message.id, message.niceFlag === 1 ? 0 : 1); }} 
                className="w-full text-left p-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >{message.niceFlag === 1 ? "いいね解除" : "いいね登録"}</button>
            )}
          </div>
          
          {!isOnlyStamp && type === "chat" && (
            <>
              <div className="w-full h-px bg-gray-100 my-1" />
              <div className="flex flex-col w-full p-2 gap-2">
                <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">背景色を選択</p>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2 px-1" style={{ scrollbarWidth: 'none' }}>
                  {Object.entries(CHAT_COLOR_PALETTE).map(([index, color]) => (
                    <button 
                      key={index} 
                      disabled={isSubmitting}
                      className={`w-7 h-7 flex-shrink-0 rounded-full border disabled:opacity-50 disabled:cursor-not-allowed ${message.background === Number(index) ? "ring-2 ring-blue-400" : ""}`} 
                      style={{ backgroundColor: color }} 
                      onClick={() => { onOpenChange(false); onBackgroundChange?.(message.id, Number(index)); }} 
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>

      
      <div className="flex items-center justify-end w-full">
        <div className="w-4 h-4  flex-shrink-0 mr-3">
          {type === "chat" ? (
            <>
              {message.favoriteFlag === 1 && (
                <Star className="text-yellow-400 fill-yellow-400"/>
              )}
            </>
          ) : (
            <>
              {message.niceFlag === 1 && (
                <ThumbsUp className="text-yellow-400 fill-yellow-400"/>
              )}
            </>
          )}
        </div>
        <div 
          ref={targetRef}
          onMouseEnter={() => !isOpen && !isSubmitting && setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onContextMenu={handleContextMenu}
          style={{ 
            backgroundColor: isOnlyStamp ? "transparent" : backgroundColor,
            transition: "all 0.2s ease"
          }}
          className={`
            w-fit max-w-[80%] cursor-context-menu transition-transform duration-200 
            ${isOnlyStamp ? "p-0 pr-2" : "p-3 rounded-2xl border border-gray-200 shadow-sm"}
            ${(isHovered || isOpen) && !isSubmitting ? "brightness-90" : "brightness-100"}
          `}
        >
          {(!message.signedImageUrl && !(message as any).previewImages && !message.imageUrl && message.message) && (
            <p className="text-lg text-gray-800 whitespace-pre-wrap select-none">{message.message}</p>
          )}         
          {message.stamp ? (
            !isStampError ? (
              <img
                src={`/stamps/${message.stamp}.png`}
                className="w-32 h-32 object-contain aspect-square"
                onError={() => setIsStampError(true)}
              />
            ) : (
              <div className="w-32 h-32 flex flex-col items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-2 text-center">
                <span className="text-gray-700 font-bold text-[11px] leading-tight select-none">
                  スタンプが<br />見つかりません
                </span>
              </div>
            )
          ) : null}
          
          {((message as any).previewImages || [message.signedImageUrl]).filter(Boolean).map((url: string, index: number) => {
  
            // 💡 サーバーから届いた本物のキーがある場合はそれを使う、無ければ url (blob) を使う
            const realStorageKey = (message as any).storageKey || url;

            return !imageErrors ? (
              <img
                key={`img-item-${index}`}
                src={url} 
                alt="chat image"
                className="max-w-[200px] h-auto rounded-lg border border-gray-200"
                onLoad={() => onScrollBottom?.(true)}
                onClick={() => onImageClick?.(realStorageKey)}
                onError={() => {
                  if (!url.startsWith("blob:")) {
                    setImageErrors(true);
                  }
                }}
              />
            ) : (
              <div 
                              key={`img-error-${message.id}-${index}`} 
                              className="w-32 h-32 flex flex-col items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-2 text-center"
                            >
                              <span className="text-gray-700 font-bold text-[11px] leading-tight select-none">
                                画像が<br />見つかりません
                              </span>
                            </div>
            );
          })}
        </div>
      </div>
      <span className="text-[10px] text-gray-400 mt-1">{formatDateTime(message.createdAt, message.updated_at)}</span>
    </div>
  );
}