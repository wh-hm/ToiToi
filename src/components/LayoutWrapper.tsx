'use client';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';

  const showHeader = pathname !== '/';
  const isExcludedPage = ['/chat/', '/question_chat/'].some(path => pathname.includes(path));
  const showFooter = !isExcludedPage;

  return (
    // ★ここを flex-col と min-h-screen に変更
    <div className="flex flex-col min-h-screen">
      {showHeader && <Header />}
      
      {/* ★flex-grow で Footer 以外のスペースを全て埋める */}
      <main className="flex-grow">{children}</main>
      
      {showFooter && <Footer />}
    </div>
  );
}