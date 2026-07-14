import { useState, useCallback } from "react";

export function useCelebration() {
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationOpacity, setCelebrationOpacity] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);

  const triggerCelebration = useCallback((message?: string) => {
    setCelebrationMessage(message || null);
    setShowCelebration(true);
    
    setTimeout(() => {
      setCelebrationOpacity(true);
    }, 50);
    
    setTimeout(() => {
      setCelebrationOpacity(false);
      setTimeout(() => {
        setShowCelebration(false);
        setCelebrationMessage(null);
      }, 500);
    }, 2000); // 💡 文字を読むために表示時間を少し長め(2秒)にしています
  }, []);

  return { showCelebration, celebrationOpacity, celebrationMessage, triggerCelebration };
}

export function Celebration({ 
  show, 
  opacity, 
  message 
}: { 
  show: boolean; 
  opacity: boolean; 
  message?: string | null 
}) {
  if (!show) return null;
  
  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center z-[150] pointer-events-none transition-all duration-500 ease-out ${
        opacity ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"
      }`}
    >
      {/* 💡 画像の高さに上限(max-h-[60vh])を設け、画面に収まるように調整 */}
      <img
        src="/complete.png"
        alt="お祝い"
        className="w-full max-w-lg max-h-[90vh] object-contain transform transition-all duration-500 scale-100 drop-shadow-2xl"
      />
      
      {/* 💡 文字がくっきりと目立つようにデザインを強化 */}
      {message && (
        <div className="mt-6 px-10 py-4 bg-white/95 backdrop-blur-md border-2 border-indigo-100 rounded-full shadow-2xl transform transition-all duration-500">
          <p className="text-xl md:text-2xl font-extrabold text-indigo-600 tracking-wider">
            {message}
          </p>
        </div>
      )}
    </div>
  );
}