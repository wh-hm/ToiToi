'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react'; // signOut を追加
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, useDisclosure } from '@nextui-org/react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  
  // data.expires にセッションの期限が入っています
  const { data: session, status } = useSession();
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    if (status !== 'authenticated' || !session?.expires) return;

    // セッション期限までの時間を計算
    const expiresAt = new Date(session.expires).getTime();
    const now = Date.now();
    const timeLeft = expiresAt - now;

    if (timeLeft <= 0) {
      onOpen(); // 期限が切れていたら即モーダル
      return;
    }

    // 期限切れの瞬間にモーダルを出すタイマー
    const timer = setTimeout(() => {
      onOpen();
    }, timeLeft);

    return () => clearTimeout(timer);
  }, [session, status, onOpen]);

  const handleGoToLogin = async () => {
    onClose();
    await signOut({ redirect: false }); // サーバー側でもセッションを破棄
    router.replace('/');
    router.refresh(); // 最新の状態を取得
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