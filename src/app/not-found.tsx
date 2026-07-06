"use client"; // NextUIを使うため必須
import { Image, Button } from "@nextui-org/react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter(); // routerを呼び出す
  const handleBack = () => {
  // ブラウザの履歴が1つ以上あれば戻る
  if (window.history.length > 1) {
    router.back();
  } else {
    // なければダッシュボードへ飛ばす
    router.push("/dashboard"); 
  }
};


  return (
    <div 
      className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url(/images/shikiji_default.jpg)', opacity: 0.9 }}
    >
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
        <Image src={"not_found.png"}></Image>

        {/* メッセージエリア */}
        <div className="mb-6">
          <p className="text-lg text-slate-600 mb-3 leading-relaxed">
            お探しのページが見つかりません。<br/>
            URLが間違っているか、ページが削除された可能性があります。
          </p>
        </div>

        {/* トップへ戻るボタン */}
        <Button
          onPress={handleBack} // onClick から onPress に変更
          color="primary"
          variant="shadow"
          size="lg"
          radius="full"
          className="font-semibold text-lg px-10 py-4 shadow-primary/30"
        >
          前の画面に戻る
        </Button>
      </div>
    </div>
  );
}