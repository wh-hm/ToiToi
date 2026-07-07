import { ChatMessage } from "@/types/chat";
import { X, Download, Loader2 } from "lucide-react";
import { ImageZoomModalProps } from "@/types/chat";

export const ImageZoomModal = ({ 
  isOpen, 
  onClose, 
  imageUrl, 
  caption, 
  onDownload, 
  msg,
  isPending 
}: ImageZoomModalProps) => {
  if (!isOpen || !imageUrl) return null;

  const isDisabled = !imageUrl || isPending;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white p-6 rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
                
        {/* ヘッダー */}
        <div className="flex items-center mb-4 shrink-0">
          {caption && <div className="text-gray-700">{caption}</div>}

          <div className="flex items-center gap-2 ml-auto">

            {/* 💡 ツールチップのホバー検知用ラッパー */}
            <div className="relative group/tooltip">
              <button 
                type="button"
                onClick={() => {
                  const targetUrl = msg.image_url || imageUrl;
                  if (targetUrl && !isPending) {
                    onDownload(targetUrl);
                  }
                }}
                // 💡 disabled の時は pointer-events-none をつけてボタン単体のイベントを切りつつ、
                // カーソル自体は親の group/tooltip 側で制御します
                className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${
                  isDisabled ? 'opacity-50 pointer-events-none' : ''
                }`}
                disabled={isDisabled}
              >
                {/* 💡 isPending が true なら確実にぐるぐる回す */}
                {isPending ? (
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                ) : (
                  <Download size={24} />
                )}
              </button>

              {/* 💡 送信中（isPending）の時のみホバーで表示される案内 */}
              {isPending && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs text-white bg-gray-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity duration-200 shadow-md z-10 cursor-not-allowed">
                  現在送信中です。完了までしばらくお待ちください。
                  {/* 下矢印の突起部分 */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                </div>
              )}
            </div>

            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X size={28} />
            </button>
          </div>
        </div>

        {/* 画像表示部分 */}
        <div className="flex-1 overflow-hidden flex items-center justify-center">
          <img 
            src={
              imageUrl.startsWith("blob:")
                ? imageUrl
                : imageUrl.startsWith("/api/images/view")
                  ? imageUrl
                  : `/api/images/view?key=${encodeURIComponent(imageUrl)}&spaceId=${
                      imageUrl.split("_")[1] || "26" 
                    }`
            } 
            alt="zoomed" 
            className="max-w-full max-h-[70vh] object-contain" 
          />
        </div>
      </div>
    </div>
  );
};