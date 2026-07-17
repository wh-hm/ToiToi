"use client"; // NextUIを使うため必須
import { Image, Button } from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react"; // 1. useSessionをインポート


export default function NotFound() {
  const router = useRouter();
  const { data: session, status } = useSession(); // 2. セッション情報を取得

  // 読み込み中はボタンなどを無効化（またはスケルトン表示）するために判定
  const isLoading = status === "loading";
  
  // sessionが存在すればログイン済み（isAuthenticated）とみなす
  const isAuthenticated = !!session;

  const handleBack = () => {
    if (isLoading) return;

    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.push("/"); // またはトップページ "/"
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center px-4 ${isAuthenticated ? "min-h-[calc(100vh-7rem)]" : "min-h-[calc(100vh-3rem)]"}`}>
      <div className="absolute inset-0 bg-white/80 z-0" />
      <div className="relative z-10 flex flex-col items-center">
        <h2 
          className="text-[10rem] font-black tracking-tight drop-shadow-sm bg-clip-text text-transparent"
          style={{
            fontFamily: "'M PLUS Rounded 1c', sans-serif", 
            backgroundImage: "linear-gradient(to right, #60A5FA, #BEF264)"
          }}
        >
          404
        </h2>
        <Image src={"/not_found.png"}></Image>

        {/* メッセージエリア */}
        <div className="mb-6">
          <p className="text-lg text-slate-600 mb-3 leading-relaxed text-center">
            お探しのページが見つかりません。<br/>
            URLが間違っているか、ページが削除された可能性があります。
          </p>
        </div>

        {/* トップへ戻るボタン */}
        <Button
          onPress={handleBack}
          isDisabled={isLoading}
          color="primary"
          variant="shadow"
          size="lg"
          radius="full"
          className="font-semibold text-lg px-10 py-4 shadow-primary/30"
        >
          {isAuthenticated ? "ダッシュボードに戻る" : "ログイン画面に戻る"}
        </Button>

        
      </div>
    </div>
  );
}