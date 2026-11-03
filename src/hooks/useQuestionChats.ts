import { useState, useEffect, useCallback, useRef } from 'react';

interface QuestionChat {
  id: number;
  question_id: number;
  user_id: string;
  message: string | null;
  created_at: string;
  is_read?:number;
}

export function useQuestionChats(questionId: number | null, currentUserId: string | null) {
  const [messages, setMessages] = useState<QuestionChat[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const lastReadIdRef = useRef<number>(0);

  // 既読API呼び出し
  const markAsRead = useCallback(async (lastReadChatId: number) => {
    // 💡 ガード処理: IDやユーザーID、既読IDが正しくない場合はAPIを呼ばない
    if (!questionId || !currentUserId || typeof lastReadChatId !== 'number' || isNaN(lastReadChatId)) {
      return;
    }
    if (lastReadChatId <= lastReadIdRef.current) return;

    try {
      await fetch(`/api/questions/${questionId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          lastReadQuestionChatId: lastReadChatId,
        }),
      });
      lastReadIdRef.current = lastReadChatId;
    } catch (err) {
      console.error('既読送信エラー:', err);
    }
  }, [questionId, currentUserId]);

  // メッセージ取得処理
  const fetchMessages = useCallback(async (isFirstTime = false) => {
    // 💡 ガード処理: questionId が無いときは実行しない
    if (!questionId) {
      setIsInitialLoading(false);
      return;
    }

    if (isFirstTime) {
      setIsInitialLoading(true);
    }

    try {
      const res = await fetch(`/api/questions/${questionId}/chats`);
      if (!res.ok) throw new Error('メッセージ取得失敗');
      const data: QuestionChat[] = await res.json();

      setMessages(data);

      if (data.length > 0) {
        const latestChatId = Math.max(...data.map((m) => m.id));
        markAsRead(latestChatId);
      }
    } catch (error) {
      console.error('メッセージ取得エラー:', error);
    } finally {
      if (isFirstTime) {
        setIsInitialLoading(false);
      }
    }
  }, [questionId, markAsRead]);

  // 初期読み込みと3秒ごとのサイレントポーリング
  useEffect(() => {
    // questionId または currentUserId が無い場合はポーリングを開始しない
    if (!questionId || !currentUserId) return;

    fetchMessages(true);

    const intervalId = setInterval(() => {
      fetchMessages(false);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [questionId, currentUserId, fetchMessages]);

  return { messages, isInitialLoading, refetch: () => fetchMessages(false) };
}