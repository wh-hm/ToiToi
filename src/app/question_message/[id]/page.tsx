'use client';
import { useState, useEffect } from "react";
import ChatInput from "@/components/ChatInput";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const [inputText, setInputText] = useState("");
  const [questionId, setQuestionId] = useState("");
  const [messages, setMessages] = useState([]);
  const [editValues, setEditValues] = useState<{ [key: number]: string }>({});

  // 1. URLからIDを取得
  useEffect(() => {
    const init = async () => {
      const { id } = await params;
      setQuestionId(id);
    };
    init();
  }, [params]);

  // 2. IDがセットされたらメッセージを取得
  useEffect(() => {
    if (questionId) {
      fetchMessages();
    }
  }, [questionId]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/question_message?questionId=${questionId}`);
      const data = await res.json();
      setMessages(data || []);
    } catch (error) {
      console.error("メッセージ取得エラー:", error);
    }
  };

  const handleSend = async () => {
    const { id } = await params;
    const payload = { content: inputText, type: "text" };
    await fetch(`/api/question_message?questionId=${questionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setInputText("");
    fetchMessages();
  };

  const handleSendStamp = async (stampUrl: string) => {
    const { id } = await params;
    await fetch(`/api/question_message?questionId=${questionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: stampUrl, type: "stamp" }),
    });
    fetchMessages();
  };

  const handleUploadImage = async (file: File) => {
    const { id } = await params;
    const formData = new FormData();
    formData.append("file", file);
    await fetch(`/api/question_message?questionId=${questionId}`, { method: "POST", body: formData });
    fetchMessages();
  };

  const handleEditChange = (id: number, value: string) => {
    setEditValues(prev => ({ ...prev, [id]: value }));
  };

  //編集
  const handleEditClick = async (chatId: number) => {
    await fetch(`/api/question_message/${chatId}/update`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, message: editValues[chatId] }),
    });
    fetchMessages();
  };

  //削除
  const handleDeleteClick = async (chatId: number) => {
    if (!confirm("本当に削除しますか？")) return;
    await fetch(`/api/question_message/${chatId}/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: questionId }),
    });
    fetchMessages();
  };



  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {Array.isArray(messages) && messages.length > 0 ? (
          messages.map((msg: any) => (
            <div key={msg.id} style={{ marginBottom: '15px', borderBottom: '1px solid #eee' }}>
              <p>{msg.message}</p>
              <input 
                defaultValue={msg.message}
                onChange={(e) => handleEditChange(msg.id, e.target.value)} 
              />
              <button onClick={() => handleEditClick(msg.id)}>編集</button>
              <button onClick={() => handleDeleteClick(msg.id)}>削除</button>
            </div>
          ))
        ) : (
          <p>メッセージはありません</p>
        )}
      </div>

      <ChatInput 
        value={inputText} 
        onChange={setInputText} 
        onSend={handleSend} 
        onSendStamp={handleSendStamp} 
        onUploadImage={handleUploadImage}
      />
    </div>
  );
}