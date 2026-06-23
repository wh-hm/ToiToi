"use client";
import { useRouter } from "next/navigation";
import SpaceModal from "@/components/SpaceModal";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import SpaceList from "@/components/SpaceList";

type Space = {
  id: string;
  name: string;
  space_type: number;
  favorite: number;
  is_archived: number;
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
  type1Empty: boolean;
  type2Empty: boolean;
  type3Empty: boolean;
  allEmpty: boolean;
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [spaces, setSpaces] = useState<SpacesState>({
    type1: [], type2: [], type3: [],
    type1Empty: false, type2Empty: false, type3Empty: false, allEmpty: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [modalFavorite, setModalFavorite] = useState<number>(0);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

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
  

  const updateLoginMessage = (streakDays: number, isStreakAchieved: boolean) => {
    // 1. 全イベント発生時の現在時刻をリアルタイムに取得
    const now = new Date();
    const hour = now.getHours();

    let timeZone: "朝" | "昼" | "夜" = "昼";

    // 2. 時間帯判定 (朝: 3:00〜10:59 / 昼: 11:00〜18:59 / 夜: 19:00〜2:59)
    if (hour >= 3 && hour < 11) {
      timeZone = "朝";
    } else if (hour >= 11 && hour < 19) {
      timeZone = "昼";
    } else {
      timeZone = "夜";
    }

    // 3. メッセージ一覧マスターデータの定義（仕様書を完全再現）
    const messageMaster = {
      "朝": {
        charName: "しきじー",
        image: "/stamps/shikiji_default.png",
        normal: [
          "おはよう よく来たな 共に頑張ろう",
          "Good Morning ん？ わしは英語も話せるじいじだぞ？",
          "勉強しに来るとは偉いぞ！ どれじいじがお菓子をあげよう"
        ],
        success: `おお！ 連続ログイン日数${streakDays}日が達成したぞ！ おめでとう！`
      },
      "昼": {
        charName: "といまる",
        image: "/stamps/toimaru_default.png",
        normal: [
          "こんにちは〜 今日も一緒に頑張ろうね〜",
          "ハロ〜 眠くなったらこまめに休憩してね〜",
          "お昼ご飯は食べた〜？ きっと今日はいいことがあるね〜"
        ],
        success: `わ〜 連続で${streakDays}日も来れて偉いね〜 達成したよ！`
      },
      "夜": {
        charName: "フクロウ",
        image: "/stamps/hukurou_default.png",
        normal: [
          "ホー(こんばんは あなたに会えたことを嬉しく思います。)",
          "ホーホー(Good evening 夕飯はきちんと食べましたか？)",
          "ホーホーホー(こんな遅い時間まで作業するあなたはとても偉いです。 私はあなたをとても尊敬しています。)"
        ],
        success: `ホー！（おめでとうございます。 無事連続ログイン日数${streakDays}日が達成されました。 今日は自身を労ってくださいね。）`
      }
    };

    const selectedZone = messageMaster[timeZone];
    let finalMessageText = "";

    // 4. 分岐条件の判定
    if (isStreakAchieved) {
      finalMessageText = selectedZone.success;
    } else {
      const randomIndex = Math.floor(Math.random() * 3);
      finalMessageText = selectedZone.normal[randomIndex];
    }

    setCurrentLoginMessage({
      name: selectedZone.charName,
      text: finalMessageText,
      image: selectedZone.image
    });
  };

  const handleModalFavoriteToggle = () => {
    setModalFavorite(prev => (prev === 1 ? 0 : 1));
  };

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
      const res = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleStatus: true })
      });

      if (res.ok) {
        await fetchSpaces();
      }
    } catch (error) {
      console.error("ステータス更新失敗:", error);
    }
  };

  const handleDelete = async (id: string, spaceType: number) => {
    if (!confirm("本当に削除しますか？")) return;
    try {
      const res = await fetch(`/api/spaces/${id}?space_type=${spaceType}`, {
        method: "DELETE",
      })
      if (res.ok) {
        await fetchSpaces();
        window.dispatchEvent(new Event("refresh-header"));
      }
    } catch (error) {
      console.error("削除失敗:", error);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  const fetchSpaces = async () => {
    if (!session?.user?.id) return null;
    setIsLoading(true);

    try {
      const res = await fetch("/api/dashboard/");
      if (!res.ok) return null;

      const data = await res.json();

      if (data.goal) {
        if (Array.isArray(data.goal)) {
          setGoal(data.goal[0] || null);
        } else {
          setGoal(data.goal);
        }
      } else {
        setGoal(null);
      }

      if (data.loginInfo) {
        setLoginInfo(data.loginInfo);
        const streakDays = data.loginInfo.streak_days ?? 0;
        const isStreakAchieved = data.loginInfo.is_streak_achieved ?? false;
        updateLoginMessage(streakDays, isStreakAchieved);
      } else {
        // APIからログイン情報が届いていない場合のフォールバック（安全装置）
        console.warn("APIからloginInfoが取得できませんでした。デフォルト値でメッセージを表示します。");
        updateLoginMessage(0, false);
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
        }));
      };

      const sortSpaces = (list: Space[]): Space[] => {
        return [...list].sort((a, b) => {
          if (a.is_archived !== b.is_archived) {
            return a.is_archived - b.is_archived;
          }
          if (a.favorite !== b.favorite) {
            return b.favorite - a.favorite;
          }
          return 0;
        });
      };

      const filterByArchiveSetting = (list: Space[], isShowArchived: number): Space[] => {
        if (isShowArchived === 1) {
          return sortSpaces(list);
        }
        return sortSpaces(list.filter(s => s.is_archived === 0));
      };

      const type1 = filterByArchiveSetting(convertAndFilter(targetData.type1), showArchivedType1);
      const type2 = filterByArchiveSetting(convertAndFilter(targetData.type2), showArchivedType2);
      const type3 = filterByArchiveSetting(convertAndFilter(targetData.type3), showArchivedType3);

      const newState = {
        type1, type2, type3,
        type1Empty: type1.length === 0,
        type2Empty: type2.length === 0,
        type3Empty: type3.length === 0,
        allEmpty: type1.length + type2.length + type3.length === 0,
      };

      setSpaces(newState);
      return targetData;
    } catch (error) {
      console.error("取得失敗:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") fetchSpaces();
  }, [status, showArchivedType1, showArchivedType2, showArchivedType3]);

  if (status === "loading") return <div>読み込み中...</div>;

  const showActiveGoal = !!(goal && goal.content && goal.content.trim() !== "");

  return (
    <>
      <section style={{ maxWidth: "900px", margin: "40px auto", padding: "30px", background: "white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "20px" }}>ダッシュボード</h1>

        {currentLoginMessage.name && (
          <div style={{
            marginBottom: "25px",
            display: "flex",
            alignItems: "center",
            gap: "16px"
          }}>
            {/* 左側：キャラクター画像と名前 */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flexShrink: 0, width: "70px" }}>
              <img
                src={currentLoginMessage.image}
                alt={currentLoginMessage.name}
                style={{
                  width: "55px",
                  height: "55px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid #cbd5e1"
                }}
              />
              <span style={{ fontSize: "12px", fontWeight: "bold", color: "#475569", textAlign: "center" }}>
                {currentLoginMessage.name}
              </span>
            </div>

            {/* 右側：フキダシ風メッセージコンテナ */}
            <div style={{
              position: "relative",
              flexGrow: 1,
              padding: "16px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#1e293b",
              fontWeight: "500",
              lineHeight: "1.5"
            }}>
              {/* フキダシの左側の三角形の角 */}
              <div style={{
                position: "absolute",
                left: "-6px",
                top: "50%",
                transform: "translateY(-50%) rotate(45deg)",
                width: "10px",
                height: "10px",
                background: "#f8fafc",
                borderLeft: "1px solid #e2e8f0",
                borderBottom: "1px solid #e2e8f0"
              }}></div>
              {currentLoginMessage.text}
            </div>
          </div>
        )}

        {loginMessage && <div style={{ padding: "15px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "6px", marginBottom: "20px" }}>{loginMessage}</div>}

        {/* 目標管理エリア */}
        <div style={{ marginBottom: "25px" }}>
          {showActiveGoal ? (
            <div
              style={{
                padding: "20px",
                background: "#fef9c3",
                border: "1px solid #fef08a",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px"
              }}
            >
              {/* 左側エリア：バッジ ⇄ 目標文 の横並び */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                flexGrow: 1
              }}>
                {/* 達成/未達成バッジ */}
                <div style={{ flexShrink: 0 }}>
                  <span
                    style={{
                      padding: "6px 12px",
                      background: goal?.status === 1 ? "#16a34a" : "#dc2626",
                      color: "white",
                      borderRadius: "4px",
                      fontSize: "13px",
                      fontWeight: "bold",
                      display: "inline-block",
                      userSelect: "none"
                    }}
                  >
                    {goal?.status === 1 ? "達成" : "未達成"}
                  </span>
                </div>
                {/* 目標テキスト */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div style={{ fontSize: "12px", color: "#854d0e", fontWeight: "bold" }}>今週の目標</div>
                  <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1e293b", lineHeight: "1.4" }}>
                    {goal?.content}
                  </div>
                </div>
              </div>

              {/* 右側エリア：ステータス切り替え・編集ボタン */}
              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={handleToggleGoalStatus}
                  style={{
                    padding: "8px 16px",
                    background: goal?.status === 1 ? "#64748b" : "#16a34a",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "14px",
                    transition: "all 0.2s ease"
                  }}
                >
                  {goal?.status === 1 ? "未達成に戻す" : "達成にする！"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType(99);
                    setEditingSpace({
                      id: goal?.id || "edit_goal",
                      name: goal?.content || "",
                      space_type: 99,
                      favorite: 0,
                      is_archived: 0
                    });
                    setIsModalOpen(true);
                  }}
                  style={{
                    padding: "8px 16px",
                    background: "#ca8a04",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "14px"
                  }}
                >
                  編集
                </button>
              </div>
            </div>
          ) : (
            /* 目標が未登録のとき（緑カードと右端の登録ボタン） */
            <div style={{ padding: "20px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "16px", color: "#166534", fontWeight: "bold" }}>
                  今週の目標を登録しよう！
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedType(99);
                  setEditingSpace({ id: "new_goal", name: "", space_type: 99, favorite: 0, is_archived: 0 });
                  setIsModalOpen(true);
                }}
                style={{
                  padding: "8px 16px",
                  background: "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "14px",
                  flexShrink: 0
                }}
              >
                登録
              </button>
            </div>
          )}
        </div>

        {/* 各スペース一覧 */}
        <SpaceList
          key={`type1_${spaces.type1.map(s => `${s.id}-${s.favorite}-${s.is_archived}`).join(',')}`}
          title="チャット"
          items={spaces.type1}
          showArchived={showArchivedType1}
          onToggleArchive={(checked) => setShowArchivedType1(checked ? 1 : 0)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <SpaceList
          key={`type2_${spaces.type2.map(s => `${s.id}-${s.favorite}-${s.is_archived}`).join(',')}`}
          title="ToDoリスト"
          items={spaces.type2}
          showArchived={showArchivedType2}
          onToggleArchive={(checked) => setShowArchivedType2(checked ? 1 : 0)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <SpaceList
          key={`type3_${spaces.type3.map(s => `${s.id}-${s.favorite}-${s.is_archived}`).join(',')}`}
          title="質問"
          items={spaces.type3}
          showArchived={showArchivedType3}
          onToggleArchive={(checked) => setShowArchivedType3(checked ? 1 : 0)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <div style={{ marginTop: "30px", position: "relative", display: "inline-block" }}>
          <button 
            type="button"
            onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
            style={{ 
              padding: "12px 24px", 
              margin:"0",
              background: "#2563eb", 
              color: "white", 
              border: "none", 
              borderRadius: "8px", 
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
              transition: "background 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#1d4ed8"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
          >
            <span>＋</span> 新規作成
          </button>

          {isCreateMenuOpen && (
            <>
              {/* メニューの外をクリックしたときに閉じる透明な背面幕 */}
              <div 
                onClick={() => setIsCreateMenuOpen(false)} 
                style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
              />

              <div style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "6px",
                width: "180px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                gap: "2px"
              }}>
                <button
                  onClick={() => { setIsCreateMenuOpen(false); setEditingSpace(null); openModal(1); }}
                  style={{ width: "100%", background: "none", border: "none", padding: "10px 12px", textAlign: "left", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#334155", borderRadius: "6px" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  チャットを作成
                </button>
                <button
                  onClick={() => { setIsCreateMenuOpen(false); setEditingSpace(null); openModal(2); }}
                  style={{ width: "100%", background: "none", border: "none", padding: "10px 12px", textAlign: "left", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#334155", borderRadius: "6px" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  ToDoリストを作成
                </button>
                <button
                  onClick={() => { setIsCreateMenuOpen(false); setEditingSpace(null); openModal(3); }}
                  style={{ width: "100%", background: "none", border: "none", padding: "10px 12px", textAlign: "left", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#334155", borderRadius: "6px" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  質問を作成
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <SpaceModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingSpace(null); }}
        spaceType={selectedType ?? 1}
        onSuccess={async () => {
          setIsModalOpen(false);
          setEditingSpace(null);
          await fetchSpaces();
          window.dispatchEvent(new Event("refresh-header"));
        }}
        editingSpace={editingSpace}
      />
    </>
  );
}