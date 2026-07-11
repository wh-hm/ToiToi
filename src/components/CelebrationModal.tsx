import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

export const Celebration = (message: string) => {
  // 1. 新しいDOM要素をbodyの中に作る
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  // 2. モーダルを表示して、終わったら消す関数
  const close = () => {
    root.unmount();
    container.remove();
  };

  // 3. モーダルを表示
  root.render(
    <CelebrationModal message={message} onClose={close} />
  );
};

// 内部で使うだけのUIコンポーネント
const CelebrationModal = ({ message, onClose }: { message: string; onClose: () => void }) => {
  const [isOpen, setIsOpen] = useState(true);

  // 3秒後に閉じる処理
  setTimeout(() => {
    setIsOpen(false);
    setTimeout(onClose, 500); // アニメーション終了を待ってDOMを削除
  }, 3000);

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-[9999] transition-all duration-500 ease-out 
        ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-8 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 flex flex-col items-center justify-center">
        <img src="/complete.png" alt="お祝い" className="max-w-[90vw] w-full" />
       <p 
  className="absolute top-[20%] left-1/2 -translate-x-1/2 text-5xl md:text-7xl font-black text-white tracking-widest rotate-[-3deg] whitespace-nowrap" // ★ここを追加
  style={{ 
      textShadow: '3px 3px 0px #FF9500, 6px 6px 0px rgba(0,0,0,0.15)',
      fontFamily: "'M PLUS Rounded 1c', 'Rounded Mplus 1c', 'Hiragino Maru Gothic ProN', sans-serif" 
  }}
>
  {message}
</p>
      </div>
    </div>
  );
};