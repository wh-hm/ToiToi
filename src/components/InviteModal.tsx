"use client";

import { useState } from "react";
import { SpacesState } from "@/types/space";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaces: SpacesState;
  currentUserId: string;
}

export default function InviteModal({ isOpen, onClose, spaces, currentUserId }: InviteModalProps) {
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [inviteeId, setInviteeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!isOpen) return null;

  // すべてのスペースを1つの配列にまとめる（選択肢用）
  const allSpaces = [
    ...spaces.chat.map(s => ({ ...s, category: 'チャット' })),
    ...spaces.task.map(s => ({ ...s, category: 'タスク' })),
    ...spaces.question.map(s => ({ ...s, category: '質問' }))
  ];

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          space_id: Number(selectedSpaceId),
          invitee_id: inviteeId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert("招待を送信しました！");
      onClose();
    } catch (error: any) {
      setMessage(`エラー: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl text-black">
        <h2 className="text-xl font-bold mb-4">メンバーを招待</h2>

        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">招待先のスペース</label>
            <select
              value={selectedSpaceId}
              onChange={(e) => setSelectedSpaceId(e.target.value)}
              className="w-full border rounded-xl p-3 bg-white"
              required
            >
              <option value="">スペースを選択してください</option>
              {allSpaces.map((space) => (
                <option key={space.id} value={space.id}>
                  [{space.category}] {space.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">招待するユーザーID</label>
            <input
              type="text"
              placeholder="ユーザーIDを入力"
              value={inviteeId}
              onChange={(e) => setInviteeId(e.target.value)}
              className="w-full border rounded-xl p-3"
              required
            />
          </div>

          {message && <p className="text-red-500 text-sm">{message}</p>}

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-xl text-gray-600 hover:bg-gray-100"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold"
            >
              {loading ? "送信中..." : "招待を送信"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}