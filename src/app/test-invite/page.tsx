"use client";

import { useState } from "react";

export default function TestInvitePage() {
  const [spaceId, setSpaceId] = useState("");
  const [inviterId, setInviterId] = useState("");
  const [inviteeId, setInviteeId] = useState("");
  const [message, setMessage] = useState("");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("送信中...");

    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          space_id: Number(spaceId),
          inviter_id: inviterId,
          invitee_id: inviteeId,
        }),
      });

      if (!response.ok) {
        // 何らかのHTTPエラー（404, 500など）が返ってきた場合
        throw new Error(`サーバーエラー: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setMessage(`成功: ${data.message}`);

      if (!response.ok) {
        throw new Error(data.error || "エラーが発生しました");
      }

      setMessage(`成功: ${data.message}`);
    } catch (error: any) {
      setMessage(`失敗: ${error.message}`);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">招待API テスト画面</h1>
      
      <form onSubmit={handleInvite} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">スペースID (数値)</label>
          <input
            type="number"
            value={spaceId}
            onChange={(e) => setSpaceId(e.target.value)}
            className="w-full border p-2 rounded text-black"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">招待元ユーザーID (あなたのID)</label>
          <input
            type="text"
            value={inviterId}
            onChange={(e) => setInviterId(e.target.value)}
            className="w-full border p-2 rounded text-black"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">招待先ユーザーID (相手のID)</label>
          <input
            type="text"
            value={inviteeId}
            onChange={(e) => setInviteeId(e.target.value)}
            className="w-full border p-2 rounded text-black"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 font-bold"
        >
          招待を送信する
        </button>
      </form>

      {message && (
        <div className="mt-6 p-4 border rounded bg-gray-50 text-black">
          {message}
        </div>
      )}
    </div>
  );
}