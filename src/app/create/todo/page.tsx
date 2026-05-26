"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateSpacePage() {
  const [name, setName] = useState("");
  const router = useRouter();

  const handleCreate = async () => {
    if (!name.trim()) return;

    const res = await fetch("/api/space", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const data = await res.json();

    if (res.ok) {
      router.push(`/todo/${data.id}`); // ← ToDoなら /todo/${id} に変える
    }
  };

  return (
    <section className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold">ToDoを作成</h1>

      <input
        type="text"
        placeholder="スペース名を入力"
        className="w-full border p-2 rounded"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <button
        onClick={handleCreate}
        className="w-full bg-blue-600 text-white py-2 rounded"
      >
        作成する
      </button>
    </section>
  );
}
