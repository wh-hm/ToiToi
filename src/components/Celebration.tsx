import { useState, useCallback } from "react";

export function useCelebration() {
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationOpacity, setCelebrationOpacity] = useState(false);

  const triggerCelebration = useCallback(() => {
    setShowCelebration(true);
    setTimeout(() => {
      setCelebrationOpacity(true);
    }, 50);
    setTimeout(() => {
      setCelebrationOpacity(false);
      setTimeout(() => {
        setShowCelebration(false);
      }, 500);
    }, 1500);
  }, []);

  return { showCelebration, celebrationOpacity, triggerCelebration };
}

export function Celebration({ show, opacity }: { show: boolean; opacity: boolean }) {
  if (!show) return null;
  
  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-[100] pointer-events-none transition-all duration-500 ease-out ${
        opacity ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"
      }`}
    >
      <img
        src="/complete.png"
        alt="お祝い"
        className="max-w-[90vw] w-full transform transition-all duration-500 scale-100"
      />
    </div>
  );
}