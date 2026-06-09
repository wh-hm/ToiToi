export const formatDateTime = (createdAt: string | null, updatedAt: string | null = null) => {
  if (!createdAt) return "";
  
  const created = new Date(createdAt);
  const updated = updatedAt ? new Date(updatedAt) : null;
  const now = new Date();

  // 日付と時間のフォーマット
  const formatFull = (date: Date) => {
    const d = date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).replace(/\//g, '/');
    const t = date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${d} ${t}`;
  };

  const formatSmart = (date: Date) => {
    const isToday = date.toDateString() === now.toDateString();
    const timeOnly = date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    return isToday ? timeOnly : formatFull(date);
  };

  const baseDisplay = formatSmart(created);

  // 編集がある場合
  if (updated && updated.getTime() > created.getTime() + 1000) {
    return `${baseDisplay} (編集: ${formatSmart(updated)})`;
  }

  return baseDisplay;
};