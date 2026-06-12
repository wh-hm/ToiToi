import { X } from "lucide-react";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  imageFiles: File[] | null;
  index: number | null;
}

export const PreviewModal = ({ isOpen, onClose, onConfirm, imageFiles, index }: PreviewModalProps) => {
  if (!isOpen || index === null || !imageFiles || !imageFiles[index]) return null;

  const currentFile = imageFiles[index];

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" 
      onClick={onClose}
    >
      <div 
        // ★ max-w-5xl にしてモーダルの幅を大幅に拡大
        className="bg-white p-6 rounded-2xl w-full max-w-5xl h-auto max-h-[95vh] flex flex-col relative shadow-2xl" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="text-lg font-bold truncate text-gray-800 pr-4">
            {currentFile.name}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0"
          >
            <X size={28} />
          </button>
        </div>

        {/* 画像表示エリア */}
        {/* ★ max-h-[80vh] に引き上げ、画面の高さギリギリまで活用 */}
        <div className="flex-1 min-h-0 flex items-center justify-center mb-6 overflow-hidden">
          <img 
            src={URL.createObjectURL(currentFile)} 
            alt="preview" 
            className="max-w-full max-h-[95vh] object-contain rounded-lg" 
          />
        </div>
      </div>
    </div>
  );
};