"use client";
import { useRouter } from "next/navigation";
import SpaceModal from "@/components/SpaceModal";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import SpaceList from "@/components/SpaceList";
import { fetchWithTimeout } from "@/lib/api"; 

function Loading() {
  return <div style={{ textAlign: "center", color: "#64748b", fontWeight: "bold" }}>読み込み中...</div>;
}

type Space = {
  id: string;
  name: string;
  space_type: number;
  favorite: number;
  is_archived: number;
  count?: number;
};
type Goal = {
  id: string;
  content: string | null;
  status: number;
};
type SpacesState = {
  type1: Space[];
  type2: Space[];
  type3: Space[];
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [spaces, setSpaces] = useState<SpacesState>({
    type1: [],
    type2: [],
    type3: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [modalFavorite, setModalFavorite] = useState<number>(0);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [consecutiveLoginDays, setConsecutiveLoginDays] = useState<number>(0);
  
  // 🛠️ 異常系用のステート定義
  const [loginError, setLoginError] = useState<boolean>(false); 
  const [toastMessage, setToastMessage] = useState<string | null>(null); // トースト用文字列

  const [goal, setGoal] = useState<Goal | null>(null);
  const [loginInfo, setLoginInfo] = useState<any>(null);
  const [loginMessage, setLoginMessage] = useState("");
  const [showArchivedType1, setShowArchivedType1] = useState<number>(0);
  const [showArchivedType2, setShowArchivedType2] = useState<number>(0);
  const [showArchivedType3, setShowArchivedType3] = useState<number>(0);

  const [currentLoginMessage, setCurrentLoginMessage] = useState<{ name: string; text: string; image: string }>({
    name: "",
    text: "",
    image: ""
  });

  // 🛠️ トーストを自動で消すタイマー処理
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000); // 4秒後に非表示
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const updateLoginMessage = (streakDays: number, isStreakAchieved: boolean) => {
    const now = new Date();
    const hour = now.getHours();
    let timeZone: "朝" | "昼" | "夜" = "昼";

    if (hour >= 3 && hour < 11) {
      timeZone = "朝";
    } else if (hour >= 11 && hour < 19) {
      timeZone = "昼";
    } else {
      timeZone = "夜";
    }
    const messageMaster = {
      "朝": {
        charName: "しきじー",
        image: "/stamps/shikiji_default.png",
        normal: ["おはよう よく来たな 共に頑張ろう", "Good Morning!", "勉強しに来るとは偉いぞ！"],
        success: `おお！ 連続ログイン日数${streakDays}日が達成したぞ！`
      },
      "昼": {
        charName: "といまる",
        image: "/stamps/toimaru_default.png",
        normal: ["こんにちは〜 今日も一緒に頑張ろうね〜", "ハロ〜 休憩してね〜", "お昼ご飯は食べた〜？"],
        success: `わ〜 連続で${streakDays}日も来れて偉いね〜`
      },
      "夜": {
        charName: "フクロウ",
        image: "/stamps/hukurou_default.png",
        normal: ["ホー(こんばんは)", "ホーホー(夕飯は食べましたか？)", "ホーホーホー(とても偉いです)"],
        success: `ホー！（おめでとうございます。 連続ログイン日数${streakDays}日が達成されました。）`
      }
    };
    const selectedZone = messageMaster[timeZone];
    let finalMessageText = isStreakAchieved ? selectedZone.success : selectedZone.normal[Math.floor(Math.random() * 3)];
    
    setCurrentLoginMessage({
      name: selectedZone.charName,
      text: finalMessageText,
      image: selectedZone.image
    });
  };

  const handleModalFavoriteToggle = () => setModalFavorite(prev => (prev === 1 ? 0 : 1));

  useEffect(() => {
    window.addEventListener("toggle-modal-favorite", handleModalFavoriteToggle);
    return () => window.removeEventListener("toggle-modal-favorite", handleModalFavoriteToggle);
  }, []);

  const openModal = (type: number) => {
    setModalFavorite(0);
    setSelectedType(type);
    setIsModalOpen(true);
  };

  const handleEdit = (space: Space) => {
    setModalFavorite(space.favorite);
    setEditingSpace(space);
    setSelectedType(space.space_type);
    setIsModalOpen(true);
  };

  const handleToggleGoalStatus = async () => {
  try {
      const res = await fetchWithTimeout("/api/goal/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: goal?.status === 1 ? 0 : 1,
        }),
      });
      if (res.ok) await fetchSpaces();
    } catch (error) {
      console.error("ステータス更新失敗:", error);
    }
  };

  const handleDelete = async (id: string, spaceType: number) => {
    if (!confirm("本当に削除しますか？")) return;
    try {
      const res = await fetch(`/api/spaces/${id}?space_type=${spaceType}`, { method: "DELETE" });
      if (res.ok) {
        await fetchSpaces();
        window.dispatchEvent(new Event("refresh-header"));
      }
    } catch (error) {
      console.error("削除失敗:", error);
    }
  };

  // 🛠️ 異常系1: セッション無効、または未認証時に即リダイレクト
  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  const fetchSpaces = async () => {
    if (!session?.user?.id) return null;
    setIsLoading(true);
    try {
      const res = await fetch("/api/dashboard/");
      if (!res.ok) throw new Error("APIレスポンス異常");
      
      const data = await res.json();
      if (data.goal) {
        setGoal(Array.isArray(data.goal) ? (data.goal[0] || null) : data.goal);
      } else {
        setGoal(null);
      }
      
      if (data.login_management) {
        setLoginInfo(data.login_management);
        const current_streak = data.login_management.current_streak ?? 0;
        setConsecutiveLoginDays(current_streak);
        setLoginError(false); // エラーなし
        const isStreakAchieved = data.login_management.is_streak_achieved ?? false;
        updateLoginMessage(current_streak, isStreakAchieved);
      } else {
        throw new Error("ログインデータなし");
      }
      
      if (data.loginMessage) setLoginMessage(data.loginMessage);
      const targetData = data.spaces || data;
      
      const convertAndFilter = (list: any[]): Space[] => {
        if (!Array.isArray(list)) return [];
        return list.map((s) => ({
          id: String(s.id),
          name: String(s.name),
          space_type: Number(s.space_type),
          favorite: Number(s.favorite_flag),
          is_archived: Number(s.is_archived),
          count: Number(s.task_count ?? 0),
        }));
      };
      
      const sortSpaces = (list: Space[]): Space[] => {
        return [...list].sort((a, b) => {
          if (a.is_archived !== b.is_archived) return a.is_archived - b.is_archived;
          if (a.favorite !== b.favorite) return b.favorite - a.favorite;
          return 0;
        });
      };
      const filterByArchiveSetting = (list: Space[], isShowArchived: number): Space[] => {
        return isShowArchived === 1 ? sortSpaces(list) : sortSpaces(list.filter(s => s.is_archived === 0));
      };

      setSpaces({
        type1: filterByArchiveSetting(convertAndFilter(targetData.type1), showArchivedType1),
        type2: filterByArchiveSetting(convertAndFilter(targetData.type2), showArchivedType2),
        type3: filterByArchiveSetting(convertAndFilter(targetData.type3), showArchivedType3),
      });
      return targetData;
    } catch (error) {
      console.error("取得失敗:", error);
      
      // 異常系2: 一覧取得失敗時、トーストをトリガーし、一覧データを消す
      setToastMessage(" データの取得に失敗しました。");
      setLoginError(true); 
      setSpaces({ type1: [], type2: [], type3: [] });
      setGoal(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchSpaces();
  }, [status, showArchivedType1, showArchivedType2, showArchivedType3]);

  // セッション読み込み中、または未認証時はブロック
  if (status === "loading" || status === "unauthenticated") {
    return <div style={{ textAlign: "center", padding: "40px", fontWeight: "bold", color: "#64748b" }}>読み込み中...</div>;
  }

  const showActiveGoal = !!(goal && goal.content && goal.content.trim() !== "");

  return (
    <>
      {/* 🛠️ トースト通知エリア */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          background: "#ef4444",
          color: "white",
          padding: "12px 24px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 10000,
          fontWeight: "bold",
          fontSize: "14px",
          animation: "fadeIn 0.3s ease",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          {toastMessage}
        </div>
      )}

      <section style={{ maxWidth: "900px", margin: "40px auto", padding: "30px", background: "white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "20px" }}>ダッシュボード</h1>

        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
            <Loading />
          </div>
        ) : loginError ? (
          // 🛠️ 異常系2: 取得失敗時は一覧を非表示にし、専用のアナウンスのみ表示
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8", fontSize: "15px", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
            データを読み込めませんでした。通信環境を確認するか、時間をおいて再度お試しください。
          </div>
        ) : (
          <>
            {currentLoginMessage.name && (
              <div style={{
                marginBottom: "25px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "16px 20px",
              }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flexShrink: 0, width: "70px" }}>
                  <img src={currentLoginMessage.image} alt={currentLoginMessage.name} style={{ width: "55px", height: "55px", borderRadius: "50%", objectFit: "cover", border: "2px solid #cbd5e1" }} />
                  <span style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", textAlign: "center" }}>{currentLoginMessage.name}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexGrow: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#64748b" }}>
                    <span>連続ログイン:</span>
                    <span style={{ fontSize: "16px", fontWeight: "800", color: "#b45309" }}>{consecutiveLoginDays}</span>
                    <span>日目</span>
                  </div>
                  <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "500", lineHeight: "1.5" }}>{currentLoginMessage.text}</div>
                </div>
              </div>
            )}

            {/* 目標管理エリア */}
            <div style={{ marginBottom: "25px" }}>
              {showActiveGoal ? (
                <div style={{ padding: "20px", background: "#fef9c3", border: "1px solid #fef08a", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flexGrow: 1 }}>
                    <span style={{ padding: "6px 12px", background: goal?.status === 1 ? "#16a34a" : "#dc2626", color: "white", borderRadius: "4px", fontSize: "13px", fontWeight: "bold" }}>
                      {goal?.status === 1 ? "達成" : "未達成"}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <div style={{ fontSize: "12px", color: "#854d0e", fontWeight: "bold" }}>今週の目標</div>
                      <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1e293b" }}>{goal?.content}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button type="button" onClick={handleToggleGoalStatus} style={{ padding: "8px 16px", background: goal?.status === 1 ? "#64748b" : "#16a34a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}>
                      {goal?.status === 1 ? "未達成に戻す" : "達成にする！"}
                    </button>
                    <button type="button" onClick={() => { setSelectedType(99); setEditingSpace({ id: goal?.id || "edit_goal", name: goal?.content || "", space_type: 99, favorite: 0, is_archived: 0 }); setIsModalOpen(true); }} style={{ padding: "8px 16px", background: "#ca8a04", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}>
                      編集
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "20px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "16px", color: "#166534", fontWeight: "bold" }}>今週の目標を登録しよう！</span>
                  <button type="button" onClick={() => { setSelectedType(99); setEditingSpace({ id: "new_goal", name: "", space_type: 99, favorite: 0, is_archived: 0 }); setIsModalOpen(true); }} style={{ padding: "8px 16px", background: "#16a34a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}>登録</button>
                </div>
              )}
            </div>

            {/* 各スペース一覧 */}
            <SpaceList title="チャット" items={spaces.type1} showArchived={showArchivedType1} onToggleArchive={(checked) => setShowArchivedType1(checked ? 1 : 0)} onEdit={handleEdit} onDelete={handleDelete} />
            <SpaceList title="ToDoリスト" items={spaces.type2} showArchived={showArchivedType2} onToggleArchive={(checked) => setShowArchivedType2(checked ? 1 : 0)} onEdit={handleEdit} onDelete={handleDelete} />
            <SpaceList title="質問" items={spaces.type3} showArchived={showArchivedType3} onToggleArchive={(checked) => setShowArchivedType3(checked ? 1 : 0)} onEdit={handleEdit} onDelete={handleDelete} />

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "30px" }}>
              <button type="button" onClick={() => { setEditingSpace(null); openModal(1); }} style={{ padding: "12px 24px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>＋</span> 新規作成
              </button>
            </div>
          </>
        )}
      </section>

      <SpaceModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingSpace(null); }} spaceType={selectedType ?? 1} onSuccess={async () => { setIsModalOpen(false); setEditingSpace(null); await fetchSpaces(); window.dispatchEvent(new Event("refresh-header")); }} editingSpace={editingSpace} />
    </>
  );
}