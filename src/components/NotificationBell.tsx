"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Check, X, Megaphone, Trash2 } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent, Badge, Button, Spinner } from "@nextui-org/react";
import { fetchWithTimeout } from "@/lib/api";
import { ToiToiNotification } from "@/components/Toast";

type Notification = {
  id: number;
  content: string | null;
  type: number;
  is_read: number;
  created_at: string;
  space?: { id: number; name: string };
  invitation?: {
    id: number;
    status: number;
    inviter?: { username: string; profile_image_url: string };
  };
};

type ReminderItem = {
  id: number;
  task_id: number;
  remind_at: string;
  content: string;
  is_read: number;
  status: number;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"notice" | "remind">("notice");

  // お知らせの未読数（未処理の招待 OR 未読の通常通知）
  const noticeCount = notifications.filter((n) => {
    if (n.type === 1 && n.invitation) {
      return n.invitation.status === 0;
    }
    return n.is_read === 0;
  }).length;

  // リマインドの未読数
  const remindCount = reminders.filter((r) => r.is_read === 0).length;

  // 合計未読数
  const totalCount = noticeCount + remindCount;

  // お知らせとリマインドを両方取得
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [notifRes, remindRes] = await Promise.all([
        fetchWithTimeout("/api/notifications"),
        fetchWithTimeout("/api/reminder"),
      ]);

      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotifications(data.notifications || []);
      }
      if (remindRes.ok) {
        const data = await remindRes.json();
        setReminders(data.reminders || []);
      }
    } catch (error) {
      console.error("通知・リマインドの取得に失敗しました", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) fetchAll();
  };

  // 招待の承諾・拒否
  const handleInvitation = async (e: React.MouseEvent, invitationId: number, action: "accept" | "reject") => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetchWithTimeout(`/api/invitations/${invitationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "処理に失敗しました");
      ToiToiNotification.success(data.message);
      fetchAll();
      if (action === "accept") window.dispatchEvent(new Event("spacesUpdated"));
    } catch (error: any) {
      ToiToiNotification.error(error.message);
    }
  };

  // 通常通知を既読にする
  const handleReadNotification = async (notificationId: number) => {
    try {
      const res = await fetchWithTimeout("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: 1 } : n))
        );
      }
    } catch (error) {
      console.error("通知既読更新エラー", error);
    }
  };

  // 通知を非表示（論理削除）にする
  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: number) => {
    e.stopPropagation();
    try {
      const res = await fetchWithTimeout(`/api/notifications?id=${notificationId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      }
    } catch (error) {
      console.error("通知削除エラー", error);
    }
  };

  // リマインドを既読にする
  const handleReadReminder = async (reminderId: number) => {
    try {
      const res = await fetchWithTimeout(`/api/reminder/${reminderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: 1 }),
      });
      if (res.ok) {
        setReminders((prev) =>
          prev.map((r) => (r.id === reminderId ? { ...r, is_read: 1 } : r))
        );
      }
    } catch (error) {
      console.error("既読更新エラー", error);
    }
  };

  // リマインドを通知欄から削除（非表示）にする
  const handleHideReminder = async (e: React.MouseEvent, reminderId: number) => {
    e.stopPropagation();
    try {
      const res = await fetchWithTimeout(`/api/reminder/${reminderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: 1 }),
      });
      if (res.ok) {
        setReminders((prev) => prev.filter((r) => r.id !== reminderId));
      }
    } catch (error) {
      console.error("リマインド削除エラー", error);
    }
  };

  return (
    <Popover isOpen={isOpen} onOpenChange={handleOpenChange} placement="bottom-end">
      <PopoverTrigger>
        <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
          <Badge content={totalCount} color="danger" isInvisible={totalCount === 0} shape="circle">
            <Bell className="w-6 h-6 text-gray-700" />
          </Badge>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0">
        <div className="w-full flex flex-col max-h-96">
          {/* ヘッダータブ */}
          <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50/50">
            <div className="flex gap-4 px-2">
              <Badge content={noticeCount} color="danger" shape="circle" size="sm" isInvisible={noticeCount === 0}>
                <Button
                  isIconOnly
                  variant={activeTab === "notice" ? "flat" : "light"}
                  color={activeTab === "notice" ? "primary" : "default"}
                  onPress={() => setActiveTab("notice")}
                  aria-label="お知らせ"
                  size="sm"
                  className="rounded-full"
                >
                  <Megaphone size={18} />
                </Button>
              </Badge>

              <Badge content={remindCount} color="danger" shape="circle" size="sm" isInvisible={remindCount === 0}>
                <Button
                  isIconOnly
                  variant={activeTab === "remind" ? "flat" : "light"}
                  color={activeTab === "remind" ? "warning" : "default"}
                  onPress={() => setActiveTab("remind")}
                  aria-label="リマインド"
                  size="sm"
                  className="rounded-full"
                >
                  <Bell size={18} />
                </Button>
              </Badge>
            </div>
            <span className="text-sm font-bold text-gray-600 mr-2">
              {activeTab === "notice" ? "お知らせ" : "リマインド"}
            </span>
          </div>

          {/* リスト本体 */}
          <div className="overflow-y-auto p-2 h-72">
            {loading && notifications.length === 0 && reminders.length === 0 ? (
              <div className="flex justify-center p-4"><Spinner size="sm" /></div>
            ) : activeTab === "notice" ? (
              notifications.length === 0 ? (
                <div className="text-center p-6 text-gray-400 text-sm">現在お知らせはありません</div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notif) => {
                    if (notif.type === 1 && notif.invitation) {
                      const isPending = notif.invitation.status === 0;
                      return (
                        <div key={notif.id} className={`p-3 rounded-xl border ${isPending ? "bg-blue-50/50 border-blue-100" : "bg-gray-50 border-gray-100 opacity-70"}`}>
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <div className="text-sm text-gray-800 flex-1">
                              <span className="font-bold">{notif.invitation.inviter?.username || "不明なユーザー"}</span>さんから
                              スペース<span className="font-bold">「{notif.space?.name || "無名スペース"}」</span>への招待が届いています。
                            </div>
                            {!isPending && (
                              <button
                                onClick={(e) => handleDeleteNotification(e, notif.id)}
                                className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                                title="削除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          {isPending ? (
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" color="primary" variant="flat" type="button" startContent={<Check className="w-4 h-4" />} onClick={(e) => handleInvitation(e, notif.invitation!.id, "accept")} className="flex-1">参加</Button>
                              <Button size="sm" color="danger" variant="light" type="button" startContent={<X className="w-4 h-4" />} onClick={(e) => handleInvitation(e, notif.invitation!.id, "reject")} className="flex-1">拒否</Button>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500 text-right mt-1 font-medium">{notif.invitation.status === 1 ? "参加しました" : "辞退しました"}</div>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div
                        key={notif.id}
                        onClick={() => notif.is_read === 0 && handleReadNotification(notif.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-colors flex justify-between items-start gap-2 ${
                          notif.is_read === 0
                            ? "bg-blue-50/50 border-blue-100"
                            : "bg-gray-50 border-gray-100 opacity-75"
                        }`}
                      >
                        <div className="text-sm text-gray-800 flex-1">{notif.content}</div>
                        <button
                          onClick={(e) => handleDeleteNotification(e, notif.id)}
                          className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              // リマインドタブの表示
              reminders.length === 0 ? (
                <div className="text-center p-6 text-gray-400 text-sm">リマインドはありません</div>
              ) : (
                <div className="space-y-2">
                  {reminders.map((rem) => (
                    <div
                      key={rem.id}
                      onClick={() => rem.is_read === 0 && handleReadReminder(rem.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-colors flex justify-between items-start gap-2 ${
                        rem.is_read === 0
                          ? "bg-amber-50/60 border-amber-200"
                          : "bg-gray-50 border-gray-100 opacity-75"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="text-sm text-gray-800 font-medium">{rem.content}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(rem.remind_at).toLocaleString("ja-JP", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleHideReminder(e, rem.id)}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}