'use client';

import React, { useState } from 'react';
import { useQuestionChats } from '@/hooks/useQuestionChats';

interface QuestionChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionId: number | null;
  currentUserId: string;
}

export default function QuestionChatModal({
  isOpen,
  onClose,
  questionId,
  currentUserId,
}: QuestionChatModalProps) {
  // モーダルが非表示、またはquestionIdが無いときはレンダリングしない（ポーリングも走らせない）
  if (!isOpen || !questionId) return null;

  return (
    <QuestionChatContent
      questionId={questionId}
      currentUserId={currentUserId}
      onClose={onClose}
    />
  );
}

function QuestionChatContent({
  questionId,
  currentUserId,
  onClose,
}: {
  questionId: number;
  currentUserId: string;
  onClose: () => void;
}) {
  const { messages, isInitialLoading, refetch } = useQuestionChats(questionId, currentUserId);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // メッセージ送信処理
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/questions/${questionId}/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          message: inputMessage,
        }),
      });

      if (res.ok) {
        setInputMessage('');
        refetch(); // 送信成功直後にサイレント更新を実行して即時反映
      }
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg w-full max-w-lg p-6 relative flex flex-col h-[600px]">
        {/* 閉じるボタン */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-500 hover:text-black text-xl"
        >
          ✕
        </button>

        <h3 className="text-lg font-bold mb-4">質問チャット</h3>

        {/* メッセージ一覧表示エリア */}
        {isInitialLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500 text-sm">メッセージを読み込み中...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 p-3 border rounded mb-4">
            {messages.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">
                まだメッセージはありません。
              </p>
            ) : (
              messages.map((chat) => {
                const isMine = chat.user_id === currentUserId;
                return (
                  <div
                    key={chat.id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`p-3 rounded-lg max-w-xs ${
                        isMine
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="text-sm">{chat.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* メッセージ入力・送信エリア */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={isSending || !inputMessage.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-blue-600"
          >
            送信
          </button>
        </form>
      </div>
    </div>
  );
}