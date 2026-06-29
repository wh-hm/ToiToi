'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, useDisclosure } from '@nextui-org/react'; // ★ NextUIを追加
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  
  const { status } = useSession();
  
  // ★ モーダル制御用のフック（最初から閉じている状態）
  const { isOpen, onOpen, onClose } = useDisclosure();

  // 🚨 セッション切れの監視
  useEffect(() => {
    if (status === 'unauthenticated' && pathname !== '/') {
      // alertの代わりに、NextUIのモーダルをオープンする！
      onOpen();
    }
  }, [status, pathname, onOpen]);

  // ★ ログイン画面へ戻るボタンを押した時の処理
  const handleGoToLogin = () => {
    onClose();      // モーダルを閉じる
    router.push('/'); // トップページへ飛ばす
  };

  // 各種表示フラグ
  const showHeader = pathname !== '/';
  const isExcludedPage = ['/chat/', '/question_chat/'].some(path => pathname.includes(path));
  const showFooter = !isExcludedPage;

  return (
    <div className="flex flex-col min-h-screen">
      {showHeader && <Header />}
      
      <main className="flex-grow">{children}</main>
      
      {showFooter && <Footer />}

      {/* ★ セッション切れ専用のNextUIモーダル */}
      <Modal 
        isOpen={isOpen} 
        onClose={handleGoToLogin} // 外側をクリックして閉じようとした時もトップへ飛ばす
        isDismissable={false}     // 勝手に閉じられないように固定
        hideCloseButton={true}    // 右上の「×」ボタンを非表示にして逃げ道をなくす
        backdrop="blur"           // 背景をオシャレにぼかす
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">ログイン有効期限切れ</ModalHeader>
          <ModalBody>
            <p>ログインの有効期限が切れました。お手数ですが、再度ログインをお願いいたします。</p>
          </ModalBody>
          <ModalFooter>
            {/* 完全にログインが切れているので、ボタンを押させてトップへ戻す */}
            <Button color="primary" onPress={handleGoToLogin} className="w-full font-bold">
              ログイン画面へ戻る
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}