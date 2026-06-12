// components/chat/ImageZoomModal.tsx
import React from 'react';

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
}

export const ImageZoomModal = ({ isOpen, onClose, imageUrl }: ImageZoomModalProps) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose} // 背景クリックで閉じる
    >
      <img 
        src={imageUrl} 
        alt="zoomed" 
        className="max-w-[90vw] max-h-[90vh] object-contain" 
        onClick={(e) => e.stopPropagation()} // 画像クリック時は閉じないようにする
      />
    </div>
  );
};