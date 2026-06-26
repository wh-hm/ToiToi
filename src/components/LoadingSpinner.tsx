
interface LoadingProps {
    size?: "sm" | "md" | "lg";
    text?: string;
    className?: string;
}

export const Loading = ({ size = "md", text, className = "" }: LoadingProps) => {
  // サイズごとのクラス定義
    const sizeMap = {
        sm: "w-5 h-5 border-2",
        md: "w-8 h-8 border-4",
        lg: "w-12 h-12 border-4",
    };

    return (
        <div className={`flex flex-col items-center justify-center gap-3 p-4 ${className}`}>
        {/* ぐるぐる本体 */}
        <div 
            className={`${sizeMap[size]} border-gray-200 border-t-emerald-500 rounded-full animate-spin`} 
        />
        
        {/* オプションのテキスト */}
        {text && (
            <p className="text-sm font-medium text-gray-500 animate-pulse">{text}</p>
        )}
        </div>
    );
};