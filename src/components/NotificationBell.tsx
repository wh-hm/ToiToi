"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent, Badge, Button, Spinner } from "@nextui-org/react";
import { fetchWithTimeout } from "@/lib/api";
import { ToiToiNotification } from "@/components/Toast";

// 通知の型定義
type Notification = {
  id: number;
  content: string;
  type: number;
  created_at: string;
  space?: {
    id: number;
    name: string;
  };
  invitation?: {
    id: number;
    status: number; // 0: 保留, 1: 承認, 2: 拒否
    inviter?: {
      username: string;
      profile_image_url: string;
    };
  };
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // 未処理（保留中: status === 0）の招待数をカウント
  const pendingCount = notifications.filter(
    (n) => n.type === 1 && n.invitation?.status === 0
  ).length;

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithTimeout("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("通知の取得に失敗しました", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // コンポーネントマウント時とポップオーバーを開いた時に通知を取得
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchNotifications();
    }
  };

  // 招待に対する回答（承認・拒否）
  const handleInvitation = async (e: React.MouseEvent,invitationId: number, action: "accept" | "reject") => {
    e.preventDefault();
    e.stopPropagation();
    const currentScrollY = window.scrollY;
    try {
      const res = await fetchWithTimeout(`/api/invitations/${invitationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "処理に失敗しました");
      }

      ToiToiNotification.success(data.message);
      
      // 成功したら通知リストを再取得（またはローカルステートを更新）
      fetchNotifications();

      // 承認した場合は画面をリフレッシュして新しいスペースを表示
      if (action === "accept") {
        window.dispatchEvent(new Event("spacesUpdated"));
      }
    } catch (error: any) {
      ToiToiNotification.error(error.message);
    }
  };

  return (
    <Popover isOpen={isOpen} onOpenChange={handleOpenChange} placement="bottom-end">
      <PopoverTrigger>
        <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
          <Badge content={pendingCount} color="danger" isInvisible={pendingCount === 0} shape="circle">
            <Bell className="w-6 h-6 text-gray-700" />
          </Badge>
        </button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0">
        <div className="w-full flex flex-col max-h-96">
          <div className="p-4 border-b border-gray-100 font-bold text-gray-700">
            お知らせ
          </div>
          
          <div className="overflow-y-auto p-2">
            {loading && notifications.length === 0 ? (
              <div className="flex justify-center p-4">
                <Spinner size="sm" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center p-6 text-gray-400 text-sm">
                現在通知はありません
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notif) => {
                  // 招待通知の場合のUI
                  if (notif.type === 1 && notif.invitation) {
                    const isPending = notif.invitation.status === 0;
                    return (
                      <div key={notif.id} className={`p-3 rounded-xl border ${isPending ? "bg-blue-50/50 border-blue-100" : "bg-gray-50 border-gray-100 opacity-70"}`}>
                        <div className="text-sm text-gray-800 mb-2">
                          <span className="font-bold">{notif.invitation.inviter?.username || "不明なユーザー"}</span>さんから
                          スペース<span className="font-bold">「{notif.space?.name || "無名スペース"}」</span>への招待が届いています。
                        </div>
                        
                        {isPending ? (
                          <div className="flex gap-2 mt-2">
                            <Button 
                              size="sm" 
                              color="primary" 
                              variant="flat" 
                              type="button"
                              startContent={<Check className="w-4 h-4" />}
                              onClick={(e) => handleInvitation(e,notif.invitation!.id, "accept")}
                              className="flex-1"
                            >
                              参加
                            </Button>
                            <Button 
                              size="sm" 
                              color="danger" 
                              variant="light" 
                              type="button"
                              startContent={<X className="w-4 h-4" />}
                              onClick={(e) => handleInvitation(e,notif.invitation!.id, "reject")}
                              className="flex-1"
                            >
                              拒否
                            </Button>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 text-right mt-1 font-medium">
                            {notif.invitation.status === 1 ? "参加しました" : "辞退しました"}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // 招待以外の通知があればここに追記
                  return (
                    <div key={notif.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="text-sm text-gray-800">{notif.content}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}