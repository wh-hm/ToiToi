import { toast, Toast } from "react-hot-toast";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

// ==========================================
// 1. トーストの見た目（コンポーネント本体）
// ==========================================
interface ToiToiToastProps {
  t: Toast;
}

export const ToiToiToast = ({ t }: ToiToiToastProps) => {
  // 💡 型を "success" | "error" | "loading" | "info" の4種類に明示的に限定
  const type = (t.type === "blank" ? "info" : t.type) as "success" | "error" | "loading" | "info";

  // 💡 エラーの原因：ここに info の定義が足りていませんでした！
  const config = {
    success: {
      bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
      icon: <CheckCircle2 size={20} className="text-emerald-500" />,
    },
    error: {
      bg: "bg-red-50 border-red-200 text-red-800",
      icon: <AlertCircle size={20} className="text-red-500" />,
    },
    loading: {
      bg: "bg-blue-50 border-blue-200 text-blue-800",
      icon: <Info size={20} className="text-blue-500 animate-pulse" />,
    },
    info: { // 👈 【追加】これで TypeScript の「info が存在しない」エラーが消えます！
      bg: "bg-blue-50 border-blue-200 text-blue-800",
      icon: <Info size={20} className="text-blue-500" />,
    },
  };

  const current = config[type] || config.error;

  return (
    <div
      className={`${
        t.visible ? "animate-enter" : "animate-leave"
      } max-w-md w-full bg-white border-2 ${current.bg} shadow-xl rounded-2xl pointer-events-auto flex p-4 items-center gap-3 transition-all`}
    >
      <div className="flex-shrink-0 bg-white/90 p-1.5 rounded-full shadow-sm border border-inherit flex items-center justify-center">
        {current.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold leading-relaxed break-words">
          {String(t.message)}
        </p>
      </div>
    </div>
  );
};

// ==========================================
// 2. 理想の呼び出し方を実現する「ToiToi専用関数」
// ==========================================
export const ToiToiNotification = {
  success: (message: string, id?: string) => {
    toast.dismiss();
    toast.custom((t) => {
      t.type = "success";
      t.message = message;
      return <ToiToiToast t={t} />;
    }, { id: id }); // 👈 オプションオブジェクトとして安全に渡す（省略形でもOK）
  },
  
  error: (message: string, id?: string) => {
    // 💡 理由：toast.dismiss() は全消去になってしまい長押し時にラグを生む原因になるため、
    // ID指定がある場合は、あえて事前にdismissしないほうが上書きが滑らかになります！
    if (!id) toast.dismiss(); 
    
    toast.custom((t) => {
      t.type = "error";
      t.message = message;
      return <ToiToiToast t={t} />;
    }, { id: id }); // 👈 ⭕ここ！react-hot-toastへしっかりIDを流し込みます
  },
  
  info: (message: string, id?: string) => {
    if (!id) toast.dismiss();
    toast.custom((t) => {
      t.type = "blank";
      t.message = message;
      return <ToiToiToast t={t} />;
    }, { id: id }); // 👈 オプションオブジェクトとして渡す
  }
};