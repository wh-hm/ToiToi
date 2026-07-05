// components/chat/ImageZoomModal.tsx
import { ChatMessage } from "@/types/chat";
import { X, Download, Loader2 } from "lucide-react"; // 👈 Loader2 を追加
import { ImageZoomModalProps } from "@/types/chat";



export const ImageZoomModal = ({ 
  isOpen, 
  onClose, 
  imageUrl, 
  caption, 
  onDownload, 
  msg,
  isPending // 👈 直接 boolean で受け取る
}: ImageZoomModalProps) => {
  if (!isOpen || !imageUrl) return null;

  // 判定を msg.isPending ではなく、リアルタイムに変化する props の isPending に統一
  const isDisabled = !imageUrl || isPending;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white p-6 rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
                
        {/* ヘッダー */}
        <div className="flex items-center mb-4 shrink-0">
          {/* キャプションがある場合のみ表示、なければスペースを占有しない */}
          {caption && <div className="text-gray-700">{caption}</div>}

          {/* ml-auto で常に右端に寄せる */}
          <div className="flex items-center gap-2 ml-auto">

            {/* ダウンロードボタンのツールチップ用ラッパー */}
            <div className="relative group">
              <button 
                type="button"
                onClick={() => {
                  // image_url の存在チェック。imageUrl（ObjectURL）でも代用可能です
                  const targetUrl = msg.image_url || imageUrl;
                  if (targetUrl && !isPending) {
                    onDownload(targetUrl);
                  }
                }}
                className={`p-2 hover:bg-gray-100 rounded-full ${isDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}
                disabled={isDisabled}
              >
                {/* 👈 送信中は自動でぐるぐる回るスピナーに切り替わる */}
                {isPending ? (
                  <Loader2 size={24} className="animate-spin text-blue-500" />
                ) : (
                  <Download size={24} />
                )}
              </button>

              {/* 👈 送信中（isPending）の時のみホバーで表示されるユーザーフレンドリーな案内 */}
              {isPending && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs text-white bg-gray-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-md z-10">
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

        <div className="flex-1 overflow-hidden flex items-center justify-center">
          <img src={imageUrl} alt="zoomed" className="max-w-full max-h-[70vh] object-contain" />
        </div>
      </div>
    </div>
  );
};