"use client";
import  Header  from "@/components/Header"
import  Footer  from "@/components/Footer"

export default function MyPage() {
  return (
    <>
        <Header/>
    <section className="max-w-md mx-auto p-6 space-y-8">

      {/* プロフィール */}
      <div className="flex flex-col items-center space-y-3">
        <div className="w-20 h-20 bg-gray-300 rounded-full" />
        <h2 className="text-xl font-bold">ユーザー名</h2>

        <div className="w-full bg-gray-100 p-4 rounded-lg flex justify-between items-center">
          <span>現在のユーザー名</span>
          <button className="text-blue-600 font-semibold">ユーザー名変更</button>
        </div>
      </div>

      {/* データ削除 */}
      <div className="bg-red-50 p-4 rounded-lg space-y-3">
        <button className="w-full bg-red-500 text-white py-2 rounded">ToDo全削除</button>
        <button className="w-full bg-red-500 text-white py-2 rounded">チャット全削除</button>
        <button className="w-full bg-red-500 text-white py-2 rounded">質問全削除</button>

        <p className="text-red-600 text-sm text-center">
          注意：この操作は取り消せません。
        </p>
      </div>

      {/* アカウント操作 */}
      <div className="space-y-3">
        <button className="w-full bg-red-600 text-white py-2 rounded">
          アカウント削除
        </button>
        <button className="w-full bg-gray-300 py-2 rounded">
          ログアウト
        </button>
      </div>

    </section>
    <Footer/>
    </>
  );
}
