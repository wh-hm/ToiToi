import { ToiToiNotification } from "@/components/Toast";
// 💡 これを共通のユーティリティ（例: src/lib/api.ts）などに置いておく
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 60000) {
  // 1. タイムアウトを制御するためのコントローラーを作成
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout); // 指定時間（5秒）が過ぎたら通信を強制遮断

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal // 2. fetchに「途中で止めるかもしれないよ」というシグナルを渡す
    });
    return response;
  } catch (error: any) {
    // 3. タイムアウトで遮断された場合、名前が 'AbortError' になる
    if (error.name === 'AbortError') {
      ToiToiNotification.error('通信がタイムアウトしました。電波の良い場所で再度お試しください。')
    // toast.error('通信がタイムアウトしました。電波の良い場所で再度お試しください。');
      throw new Error('通信がタイムアウトしました。電波の良い場所で再度お試しください。');
    }
    throw error;
  } finally {
    clearTimeout(id); // メモリリーク防止のためタイマーをクリア
  }
}