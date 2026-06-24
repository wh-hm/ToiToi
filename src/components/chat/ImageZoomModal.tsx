// components/chat/ImageZoomModal.tsx
import { ChatMessage } from "@/types/chat";
import { X, Download } from "lucide-react";

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  caption?: string;
  onDownload: (url: string) => void; // ここを追加！
  msg: ChatMessage;
}

export const ImageZoomModal = ({ isOpen, onClose, imageUrl, caption, onDownload, msg }: ImageZoomModalProps) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white p-6 rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
                
        {/* ヘッダー */}
        <div className="flex items-center mb-4 shrink-0">
          {/* キャプションがある場合のみ表示、なければスペースを占有しない */}
          {caption && <div className="text-gray-700">{caption}</div>}

          {/* ml-auto で常に右端に寄せる */}
          <div className="flex items-center gap-2 ml-auto">

            <button 
              type="button"
              // 1. msg.image_url が null でない場合のみ実行する
              // 2. Pending中も除外する
              onClick={() => {
                if (msg.image_url && !msg.isPending) {
                  onDownload(msg.image_url);
                }
              }}
              className={`p-2 hover:bg-gray-100 rounded-full ${(!msg.image_url || msg.isPending) ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!msg.image_url || msg.isPending}
            >
              <Download size={24} />
            </button>
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