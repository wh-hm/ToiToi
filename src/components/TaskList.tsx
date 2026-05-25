import { useState } from "react";


/// src/components/TaskList.tsx
export default function TaskList({ tasks, toggleComplete, onEdit, onDelete }: any) {
  // tasks が存在するか確認するための安全策
  const incomplete = tasks?.incomplete || [];
  const complete = tasks?.complete || [];

  return (
    <div className="task-list">
      <h3>未完了</h3>
      <ul>
        {incomplete.map((task: any) => (
          <li key={task.id}>
            <a href={`/question_message/${task.id}`}>
            <span style={{ cursor: "pointer", textDecoration: "underline", color: "blue" }}>
                {task.title}
            </span>
            </a>
            <button onClick={() => toggleComplete(task)}>完了にする</button>
            <button onClick={() => onEdit(task)}>編集</button>
            <button onClick={() => onDelete(task.id)}>削除</button>
          </li>
        ))}
      </ul>

      <h3>完了</h3>
      <ul>
        {complete.map((task: any) => (
        <li key={task.id}>
          <a href={`/question_message/${task.id}`}>
            <span style={{ cursor: "pointer", textDecoration: "underline", color: "blue" }}>
                {task.title}
            </span>
            </a>
            <button onClick={() => toggleComplete(task)}>未完了に戻す</button>
            <button onClick={() => onEdit(task)}>編集</button>
            <button onClick={() => onDelete(task.id)}>削除</button>
          </li>
        ))}
      </ul>
    </div>
  );
}