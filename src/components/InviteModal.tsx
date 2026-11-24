"use client";

import { useState } from "react";
import { SpacesState } from "@/types/space";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaces: SpacesState;
  currentUserId: string;
}

export default function InviteModal({ isOpen, onClose, spaces }: InviteModalProps) {
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [inviteeInput, setInviteeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!isOpen) return null;

  // 招待対象のスペース（チャット・質問）をまとめる
  const allSpaces = [
    ...spaces.chat.map((s) => ({ ...s, category: "チャット" })),
    ...spaces.question.map((s) => ({ ...s, category: "質問" })),
  ];

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // カンマまたはスペース区切りで複数ユーザーIDを配列化
    const inviterIds = inviteeInput
      .split(/[,、\s]+/)
      .map((id) => id.trim())
      .filter(Boolean);

    if (inviterIds.length === 0) {
      setMessage("エラー: 招待するユーザーIDを入力してください。");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceId: Number(selectedSpaceId),
          inviterIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(data.message || "招待を送信しました！");
      setInviteeInput("");
      setSelectedSpaceId("");
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
            <label className="block text-sm font-semibold mb-1">
              招待するユーザーID（カンマ区切りで複数可）
            </label>
            <input
              type="text"
              placeholder="例: user_abc123, user_xyz789"
              value={inviteeInput}
              onChange={(e) => setInviteeInput(e.target.value)}
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