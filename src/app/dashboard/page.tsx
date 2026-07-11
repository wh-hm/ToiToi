"use client";
//修正中
import { useRouter } from "next/navigation";
import SpaceModal from "@/components/SpaceModal";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import SpaceList from "@/components/SpaceList";
import { fetchWithTimeout } from "@/lib/api";
import { Loading } from "@/components/LoadingSpinner";
import { handleApiResponse } from "@/lib/api-utils";

// 型定義
type Space = {
  id: string;
  name: string;
  space_type: number;
  favorite: number;
  is_archived: number;
  count?: number;
  task_count?: number;
  question_count? : number;
};

type Goal = {
  id: string;
  content: string | null;
  status: number;
};

type SpacesState = {
  chat: Space[];
  task: Space[];
  question: Space[];
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [spaces, setSpaces] = useState<SpacesState>({
    chat: [],
    task: [],
    question: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [consecutiveLoginDays, setConsecutiveLoginDays] = useState<number>(0);

  // 異常系用のステート定義
  const [loginError, setLoginError] = useState<boolean>(false);

  const [goal, setGoal] = useState<Goal | null>(null);
  const [showArchivedType1, setShowArchivedType1] = useState<number>(0);
  const [showArchivedType2, setShowArchivedType2] = useState<number>(0);
  const [showArchivedType3, setShowArchivedType3] = useState<number>(0);

  const [currentLoginMessage, setCurrentLoginMessage] = useState<{ name: string; text: string; image: string }>({
    name: "",
    text: "",
    image: ""
  });
  // 連続ログインメッセージの更新
  const updateLoginMessage = (streakDays: number, isStreakAchieved: number) => {
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
    const finalMessageText = isStreakAchieved ? selectedZone.success : selectedZone.normal[Math.floor(Math.random() * 3)];

    setCurrentLoginMessage({
      name: selectedZone.charName,
      text: finalMessageText,
      image: selectedZone.image
    });
  };
  // データのAPI取得処理
  const fetchSpaces = async () => {
    if (!session?.user?.id) return null;
    setIsLoading(true);

    try {
      // ログイン状況の更新
      const loginRes = await fetchWithTimeout("/api/user/loginUpdate", { method: "PATCH" });
      if (!loginRes.ok) {
        handleApiResponse(loginRes);
      }

      // ダッシュボードデータの取得
      const res = await fetchWithTimeout("/api/dashboard");
      if (!res.ok) {
        handleApiResponse(res);
      }
      const data = await res.json();
      console.log(data);

      console.log("ダッシュボードの最新データ：", data);
      // 1. 目標データのパース

      let streakDays = 0;
      let isStreakAchieved = false;

      if (data.current_streak !== undefined) {
        streakDays = Number(data.current_streak);
        isStreakAchieved = data.is_streak_achieved ?? (streakDays > 0);
      } else if (data.login_management) {
        const mgmt = Array.isArray(data.login_management) ? data.login_management[0] : data.login_management;
        if (mgmt) {
          streakDays = Number(mgmt.current_streak ?? mgmt.streak_days ?? mgmt.continuous_days ?? 0);
          isStreakAchieved = mgmt.is_streak_achieved ?? (streakDays > 0);
        }
      } else {
        streakDays = Number(data.streak_days ?? data.continuous_days ?? 0);
        isStreakAchieved = data.is_streak_achieved ?? (streakDays > 0);
      }
      setGoal(data.goal)
      setConsecutiveLoginDays(streakDays);
      setLoginError(false);
      updateLoginMessage(streakDays, isStreakAchieved ? 1 : 0);

      const targetData = data.spaces;

      setSpaces({
        chat: targetData.chat,
        task: targetData.task,
        question: targetData.question,
      });

    } catch (error) {
      console.error("取得失敗:", error);
    } finally {
      setIsLoading(false);
    }
  };
  //  モーダル開閉制御
  const openModal = (type: number) => {
    setSelectedType(type);
    setIsModalOpen(true);
  };

  const handleEdit = (space: Space) => {
    setEditingSpace(space);
    setSelectedType(space.space_type);
    setIsModalOpen(true);
  };

  // 目標ステータスの更新
  const handleToggleGoalStatus = async () => {
    if (!goal) return;
    const newStatus = goal.status === 1 ? 0 : 1;
    setGoal(prev => prev ? { ...prev, status: newStatus } : null);

    try {
      const res = await fetchWithTimeout("/api/goal/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok){
        handleApiResponse(res);
        throw new Error();
      }
      const data = await res.json();
      setGoal(data.updatedGoal);

      // クライアント側のステートも即座に更新して fetchSpaces の無駄な通信を削減
      toast.success(data.message);
    } catch (error: any) {
      console.error(error);
    }
  };
  // 削除処理（トースト確認付き）
  const handleDelete = async (id: string, spaceType: string) => {
    toast((t) => (
      <div style={{ display: "flex", alignItems: "center", flexDirection: "column", gap: "16px", padding: "4px 10px", minWidth: "220px" }}>
        <span style={{ fontSize: "16px", color: "#363636", fontWeight: 500, fontFamily: "inherit" }}>
          本当に削除しますか？
        </span>
        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const res = await fetchWithTimeout(`/api/spaces/${id}?spaceType=${spaceType}`, { method: "DELETE" });
                if (!res.ok) {
                  handleApiResponse(res);
                  throw new Error();
                }
                const data = await res.json();
                setSpaces((prev) => {
                   // spaceType（"1", "2", "3"）に応じて更新するプロパティを決定
                  const key = spaceType === "1" ? "chat" : spaceType === "2" ? "task" : "question";
                  
                  return {
                    ...prev,
                    [key]: prev[key].filter((space) => space.id !== id)
                  };
                });

                toast.success(data.message || "スペースを削除しました。");
              } catch (e: any) {
                console.log(e);
              }
            }}
            style={{ padding: "4px 10px", fontSize: "12px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
          >OK</button>
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{ padding: "6px 12px", fontSize: "12px", background: "#f1f5f9", color: "#64748b", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}
          >Cancel</button>
        </div>
      </div>
    ), {
      duration: Infinity,
      position: "top-center",
      style: { background: "#fff", color: "#363636", boxShadow: "0 3px 10px rgba(0,0,0,0.1)", borderRadius: "8px", padding: "12px 16px", maxWidth: "350px" }
    });
  };
  // 異常系1: 未認証時に即リダイレクト
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);
  // 初期ロード時のみAPIを実行（アーカイブ切替時はクライアント側でソートするためここには含めない）
  useEffect(() => {
    if (status === "authenticated") {
      fetchSpaces();
    }
  }, [status]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f8fafc" }}>
        <Loading />
      </div>
    );
  }
  const showActiveGoal = !!(goal && goal.content && goal.content.trim() !== "");
  // お気に入り優先・リアルタイムソート＆フィルタリング関数
  const getDisplaySpaces = (list: Space[], isShowArchived: number) => {
    const sorted = [...list].sort((a, b) => {
      if (a.is_archived !== b.is_archived) return a.is_archived - b.is_archived;
      if (a.favorite !== b.favorite) return b.favorite - a.favorite;
      return 0;
    });
    if (isShowArchived === 1) return sorted;
    return sorted.filter(s => s.is_archived === 0);
  };

  const displayType1 = getDisplaySpaces(spaces.chat, showArchivedType1);
  const displayType2 = getDisplaySpaces(spaces.task, showArchivedType2);
  const displayType3 = getDisplaySpaces(spaces.question, showArchivedType3);

  return (
    <>
      <section style={{ maxWidth: "900px", margin: "40px auto", padding: "30px", background: "white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "20px" }}>ダッシュボード</h1>

        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
            <Loading />
          </div>
        ) : (
          <>
            {currentLoginMessage.name && (
              <div style={{ marginBottom: "25px", display: "flex", alignItems: "center", gap: "16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 20px" }}>
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
            {/* 目構管理エリア */}
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
            <SpaceList title="チャット" items={displayType1} showArchived={showArchivedType1} onToggleArchive={(checked) => setShowArchivedType1(checked ? 1 : 0)} onEdit={handleEdit} onDelete={(id) => handleDelete(id, "1")} onCheckError={(msg) => toast.error(msg)} />
            <SpaceList title="タスク" items={displayType2} showArchived={showArchivedType2} onToggleArchive={(checked) => setShowArchivedType2(checked ? 1 : 0)} onEdit={handleEdit} onDelete={(id) => handleDelete(id, "2")} onCheckError={(msg) => toast.error(msg)} />
            <SpaceList title="質問" items={displayType3} showArchived={showArchivedType3} onToggleArchive={(checked) => setShowArchivedType3(checked ? 1 : 0)} onEdit={handleEdit} onDelete={(id) => handleDelete(id, "3")} onCheckError={(msg) => toast.error(msg)} />

            {/* 新規作成ボタンメニュー */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "30px", position: "relative" }}>
              {isCreateMenuOpen && (
                <div style={{ position: "absolute", bottom: "50px", right: "0", background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", padding: "8px 0", display: "flex", flexDirection: "column", minWidth: "180px", zIndex: 50 }}>
                  <button type="button" onClick={() => { setEditingSpace(null); openModal(1); setIsCreateMenuOpen(false); }} style={{ padding: "10px 16px", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#334155", fontWeight: "500" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={(e) => e.currentTarget.style.background = "none"}>チャットスペース</button>
                  <button type="button" onClick={() => { setEditingSpace(null); openModal(2); setIsCreateMenuOpen(false); }} style={{ padding: "10px 16px", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#334155", fontWeight: "500" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={(e) => e.currentTarget.style.background = "none"}>タスクスペース</button>
                  <button type="button" onClick={() => { setEditingSpace(null); openModal(3); setIsCreateMenuOpen(false); }} style={{ padding: "10px 16px", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#334155", fontWeight: "500" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={(e) => e.currentTarget.style.background = "none"}>質問スペース</button>
                </div>
              )}
              <button type="button" onClick={() => setIsCreateMenuOpen(prev => !prev)} style={{ padding: "12px 24px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>{isCreateMenuOpen ? "×" : "＋"}</span> 新規作成
              </button>
            </div>
          </>
        )}
      </section>

      {/* モーダル管理 */}
      <SpaceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSpace(null);
        }}
        spaceType={selectedType ?? 1}
        editingSpace={editingSpace}
        onSave={async (name, selectedType, favorite_flag, is_archived) => {
          const hasInvalidHtmlChars = /[<>"'$&]/.test(name);
          const hasScriptKeywords = /(javascript:|script|onload|onerror|alert\s*\(|confirm\s*\(|prompt\s*\()/i.test(name);

          if (hasInvalidHtmlChars || hasScriptKeywords) {
            toast.error("不適切な文字列（スクリプトや無効な記号）が含まれているため、登録できません。");
            return;
          }
          const isGoal = selectedType === 99;
          if (!name.trim()) {
            toast.error(isGoal ? "目標を入力してください。" : "スペース名を入力してください。");
            return;
          }
          if (isGoal) {
            const MAX_GOAL_LENGTH = 50;
            if (name.trim().length > MAX_GOAL_LENGTH) {
              toast.error(`目標は${MAX_GOAL_LENGTH}文字以内で入力してください。`);
              return;
            }
          } else {
            const MAX_SPACE_LENGTH = 20;
            if (name.trim().length > MAX_SPACE_LENGTH) {
              toast.error(`スペース名は${MAX_SPACE_LENGTH}文字以内で入力してください。`);
              return;
            }
          }
          const isEditingExistingSpace = editingSpace && editingSpace.id;
          const url = isGoal
            ? "/api/goal"
            : (isEditingExistingSpace ? `/api/spaces/${editingSpace.id}` : "/api/spaces");

          const bodyData = isGoal
            ? { content: name }
            : { name: name.trim(), favoriteFlag: favorite_flag, isArchived: is_archived };

          const method = isEditingExistingSpace ? "PATCH" : "POST";
          console.log(bodyData);
          try {
            const res = await fetchWithTimeout(url, {
              method: method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(bodyData),
            });

            if (!res.ok) {
              handleApiResponse(res);
              throw new Error();
            }
            const data = await res.json();
            toast.success(isGoal ? "目標を保存しました！" : "スペースを保存しました！");
            setIsModalOpen(false);
            setEditingSpace(null);
            window.dispatchEvent(new Event("refresh-header"));
            if (isGoal) {
            // 目標の場合
              if (data.updatedGoal) setGoal(data.updatedGoal);
            } else {
              // スペースの場合
              if (isEditingExistingSpace) {
                // 更新：該当する配列内のデータを差し替え
                setSpaces((prev) => {
                  const key = selectedType === 1 ? "chat" : selectedType === 2 ? "task" : "question";
                  return {
                    ...prev,
                    [key]: prev[key].map((s) => (s.id === editingSpace.id ? { ...s, ...data.updatedSpace } : s))
                  };
                });
              } else {
                // 新規作成：該当する配列にデータを追加
                setSpaces((prev) => {
                  const key = selectedType === 1 ? "chat" : selectedType === 2 ? "task" : "question";
                  return {
                    ...prev,
                    [key]: [...prev[key], data.space]
                  };
                });
              }
            }
          } catch (error: any) {
            console.error(error);
          }
        }}
      />
    </>
  );
}