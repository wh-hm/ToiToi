"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="w-full bg-gray-200 p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold">ToiToi</h1>

      {/* マイページへのリンク */}
      <Link 
        href="/mypage" 
        className="text-blue-600 font-semibold"
      >
        マイページ
      </Link>
    </header>
  );
}
