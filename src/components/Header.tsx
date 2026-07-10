"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { 
  Navbar, NavbarBrand, NavbarContent,
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
  Accordion, AccordionItem
} from "@nextui-org/react";
import {ChevronDownIcon} from "lucide-react"



export default function Header() {
  const [data, setData] = useState<any>({ chat: [], task: [], question: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [openStates, setOpenStates] = useState({ chats: false, tasks: false, questions: false });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // スクロール監視：メニューを開いている時に外側がスクロールされたら閉じる
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleScrollCapture = (e: Event) => {
      const target = e.target as HTMLElement;
      // メニュー本体のスクロールなら閉じない
      if (drawerRef.current && drawerRef.current.contains(target)) return;
      
      setIsMobileMenuOpen(false);
    };

    document.addEventListener("scroll", handleScrollCapture, true);
    
    return () => {
      document.removeEventListener("scroll", handleScrollCapture, true);
    };
  }, [isMobileMenuOpen]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/spaces`);
      const data = await res.json();

      if (res.ok) setData(data.spaces);
  
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  const menuConfig = [
    { key: 'chats', title: 'チャット', items: data.chat, path: 'chat' },
    { key: 'tasks', title: 'タスク', items: data.task, path: 'task' },
    { key: 'questions', title: '質問', items: data.question, path: 'question' },
  ] as const;

  return (
    <>
      <Navbar className="w-full h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm" maxWidth="full">
        <NavbarBrand className="max-w-[150px]">
          <Link href="/dashboard" className="transition-transform hover:scale-105">
            <Image 
              src="/logo.png" 
              alt="ToiToi" 
              width={120} 
              height={40} 
              style={{ width: "auto", height: "auto" }} // これを追加
              priority 
            />
          </Link>
        </NavbarBrand>

        {/* PC用ナビ */}
        <NavbarContent className="hidden lg:flex" justify="end">
          <Link href="/dashboard" className="mr-4 font-medium text-gray-600">ダッシュボード</Link>
          {menuConfig.map((cat) => (
            <div key={cat.key} className="relative" onMouseEnter={() => setOpenStates(p => ({...p, [cat.key]: true}))} onMouseLeave={() => setOpenStates(p => ({...p, [cat.key]: false}))}>
              <Dropdown isOpen={openStates[cat.key]}>
                <DropdownTrigger>
                  <button className="font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-2 rounded-full capitalize flex items-center gap-1">
                    {cat.title} 
                    <ChevronDownIcon 
                      className={`w-4 h-4 transition-transform duration-300 ${
                        openStates[cat.key] ? "rotate-180" : "rotate-0"
                      }`} 
                    />
                  </button>
                </DropdownTrigger>
                <DropdownMenu aria-label={cat.title} className="p-3 bg-white rounded-[20px] shadow-xl border border-gray-100 max-h-[50vh] overflow-y-auto scrollbar-hide">
                  {isLoading ? (
                    <DropdownItem key="loading" textValue="読み込み中">読み込み中...</DropdownItem>
                  ) : cat.items.length > 0 ? (
                    cat.items.map((i: any) => <DropdownItem key={i.id} href={`/${cat.path}/${i.id}`} textValue={i.name}>{i.name}</DropdownItem>)
                  ) : (
                    <DropdownItem key="none" textValue="該当なし" className="cursor-default">スペースなし</DropdownItem>
                  )}
                </DropdownMenu>
              </Dropdown>
            </div>
          ))}
          <Link href="/mypage" className="ml-4 font-medium text-gray-600">マイページ</Link>
          <button 
            onClick={() => signOut({ callbackUrl: '/' })}
            className="ml-4 font-medium text-red-500 hover:text-red-600 transition-colors"
          >
            ログアウト
          </button>
        </NavbarContent>

        {/* スマホ用ボタン */}
        <NavbarContent className="lg:hidden" justify="end">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
          </button>
        </NavbarContent>
      </Navbar>

      {/* スライドインメニュー */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div 
            ref={drawerRef} 
            className="absolute top-0 right-0 h-full w-[280px] bg-white shadow-2xl p-4 overflow-y-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="flex justify-between items-center mb-10 pt-2 px-2">
              <span className="font-bold text-gray-800">メニュー</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-500">✕</button>
            </div>

            <div className="flex flex-col gap-1 pb-2">
              <Link className="font-bold text-gray-700 ml-2" href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>ダッシュボード</Link>
            </div>

            
            <Accordion selectionMode="multiple" className="p-2">
              {menuConfig.map((cat) => (
                <AccordionItem key={cat.key} textValue={cat.title} title={<span className="font-bold text-gray-700" >{cat.title}</span>} indicator={<ChevronDownIcon />}>
                  <div className="flex flex-col gap-1 pb-2">
                    {isLoading ? (
                      <div className="px-4 py-2 text-sm text-gray-400">読み込み中...</div>
                    ) : cat.items.length > 0 ? (
                      cat.items.map((i: any) => (
                        <Link key={i.id} href={`/${cat.path}/${i.id}`} className="block px-4 py-2 hover:bg-blue-50 rounded-lg text-sm text-gray-600" onClick={() => setIsMobileMenuOpen(false)}>{i.name}</Link>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-gray-400">スペースなし</div>
                    )}
                  </div>
                </AccordionItem>
              ))}
            </Accordion>
            <div className="border-t p-2 mt-4">
              <Link href="/mypage" className="font-bold text-blue-600 text-sm" onClick={() => setIsMobileMenuOpen(false)}>マイページ</Link>
            </div>
            <div className="border-t p-2 mt-4">
              <button 
                onClick={() => signOut({ callbackUrl: '/' })}
                className="font-bold text-red-500 text-sm text-left w-full"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}