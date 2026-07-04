'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, useDisclosure } from '@nextui-org/react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [hasRegistered, setHasRegistered] = useState(false);
  const router = useRouter();
  const pathname = usePathname() ?? '';


  // セッション有効期限の監視
  useEffect(() => {
    if (status !== 'authenticated' || !session?.expires) return;

    const expiresAt = new Date(session.expires).getTime();
    const now = Date.now();
    const timeLeft = expiresAt - now;

    if (timeLeft <= 0) {
      onOpen();
      return;
    }

    const timer = setTimeout(() => {
      onOpen();
    }, timeLeft);

    return () => clearTimeout(timer);
  }, [session, status, onOpen]);

  const handleGoToLogin = async () => {
    onClose();
    await signOut({ redirect: false });
    window.location.href = '/'; // 強制リロードでセッションを完全にクリア
  };

  const showHeader = pathname !== '/' && pathname !== '/username';
  const isExcludedPage = ['/chat/', '/question_chat/'].some(path => pathname.includes(path));
  const showFooter = !isExcludedPage;

  return (
    <div className="flex flex-col min-h-screen">
      {showHeader && <Header />}
      <main className="flex-grow">{children}</main>
      {showFooter && <Footer />}

      <Modal 
        isOpen={isOpen} 
        onClose={handleGoToLogin}
        isDismissable={false}
        hideCloseButton={true}
        backdrop="blur"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">ログイン有効期限切れ</ModalHeader>
          <ModalBody>
            <p>ログインの有効期限が切れました。再度ログインをお願いいたします。</p>
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onPress={handleGoToLogin} className="w-full font-bold">
              ログイン画面へ戻る
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}