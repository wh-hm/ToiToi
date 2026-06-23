// components/chat/ImageZoomModal.tsx
import { X, Download } from "lucide-react";

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  caption?: string;
  onDownload: (url: string) => void; // ここを追加！
}

export const ImageZoomModal = ({ isOpen, onClose, imageUrl, caption, onDownload }: ImageZoomModalProps) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white p-6 rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
                
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-4 shrink-0">
          {/* コンテンツ */}
          {caption && <div className="mb-4 text-gray-700">{caption}</div>}

          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => onDownload(imageUrl)} // ここをシンプルに
              className="p-2 hover:bg-gray-100 rounded-full"
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