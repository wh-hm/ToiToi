import { Trash2, X } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

export const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "本当に削除する？",
  description = "削除すると、このメッセージは元に戻せなくなっちゃいます。",
}: DeleteConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景の黒いモヤ（ふわっと背景を暗くする） */}
      <div 
        className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div className="relative w-full max-w-sm bg-white border border-gray-100 shadow-2xl rounded-2xl p-6 animate-in fade-in zoom-in-95 duration-200 z-10 flex flex-col items-center text-center">
        
        {/* 右上の閉じるボタン */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-50"
        >
          <X size={18} />
        </button>

        {/* ゴミ箱アイコン（丸い背景で優しく） */}
        <div className="bg-red-50 p-3 rounded-full border border-red-100 text-red-500 mb-4 flex items-center justify-center">
          <Trash2 size={24} />
        </div>

        {/* テキストエリア */}
        <h3 className="text-[16px] font-bold text-gray-900 mb-2">
          {title}
        </h3>
        <p className="text-[13px] font-medium text-gray-500 leading-relaxed mb-6">
          {description}
        </p>

        {/* ボタンエリア（ToiToi風のぷっくり丸いボタン） */}
        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[14px] font-bold rounded-xl transition-all active:scale-98"
          >
            やめる
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white text-[14px] font-bold rounded-xl shadow-md shadow-red-500/20 transition-all active:scale-98"
          >
            削除する
          </button>
        </div>

      </div>
    </div>
  );
};