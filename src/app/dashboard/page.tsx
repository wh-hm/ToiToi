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

  const [goal, setGoal] = useState<Goal | null>(null);
  const [loginInfo, setLoginInfo] = useState<any>(null);
  const [loginMessage, setLoginMessage] = useState("");
  const [showArchived, setShowArchived] = useState<number>(0);
  
  // 🌟 修正：キャラクター名、メッセージテキストに加え「画像パス」も管理できるように拡張
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
        image: "/stamps/shikiji_defualt.png", 
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
        image: "/stamps/fukurou_default.png", 
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

    // 🌟 修正：判定されたキャラクター画像パスも一緒に反映
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

      const filterByArchiveSetting = (list: Space[]): Space[] => {
        if (showArchived === 1) {
          return sortSpaces(list);
        }
        return sortSpaces(list.filter(s => s.is_archived === 0));
      };

      const type1 = filterByArchiveSetting(convertAndFilter(targetData.type1));
      const type2 = filterByArchiveSetting(convertAndFilter(targetData.type2));
      const type3 = filterByArchiveSetting(convertAndFilter(targetData.type3));

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
    updateLoginMessage(0, false);
    if (status === "authenticated") fetchSpaces();
  }, [status, showArchived]);

  if (status === "loading") return <div>読み込み中...</div>;

  const showActiveGoal = !!(goal && goal.content && goal.content.trim() !== "");

  return (
    <>
      <section style={{ maxWidth: "900px", margin: "40px auto", padding: "30px", background: "white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "20px" }}>ダッシュボード</h1>

        {/* 🌟 修正：フキダシ構造の中にキャラクター画像を美しく配置 */}
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

        {/* アーカイブ切り替えエリア */}
        <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "12px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
          <input
            type="checkbox"
            id="archiveToggle"
            checked={showArchived === 1}
            onChange={(e) => {
              const nextValue = e.target.checked ? 1 : 0;
              setShowArchived(nextValue);
            }}
            style={{ width: "16px", height: "16px", cursor: "pointer" }}
          />
          <label htmlFor="archiveToggle" style={{ fontSize: "14px", fontWeight: "bold", color: "#334155", cursor: "pointer" }}>
            アーカイブされたスペースを表示する
          </label>
        </div>

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
                alignItems: "center"
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ fontSize: "14px", color: "#854d0e" }}><strong>今週の目標：</strong></div>
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1e293b" }}>
                  {goal?.content}
                </div>
                <div style={{ marginTop: "4px" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      background: goal?.status === 1 ? "#16a34a" : "#dc2626",
                      color: "white",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "bold"
                    }}
                  >
                    {goal?.status === 1 ? "達成" : "未達成"}
                  </span>
                </div>
              </div>

              {/* ボタンエリア */}
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
            <div
              style={{
                padding: "20px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <span style={{ fontSize: "16px", color: "#166534", fontWeight: "bold" }}>
                  今週の目標を登録しよう！
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedType(99);
                  setEditingSpace({
                    id: "new_goal",
                    name: "",
                    space_type: 99,
                    favorite: 0,
                    is_archived: 0
                  });
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
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        <SpaceList
          key={`type2_${spaces.type2.map(s => `${s.id}-${s.favorite}-${s.is_archived}`).join(',')}`}
          title="ToDoリスト"
          items={spaces.type2}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        <SpaceList
          key={`type3_${spaces.type3.map(s => `${s.id}-${s.favorite}-${s.is_archived}`).join(',')}`}
          title="質問"
          items={spaces.type3}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <div style={{ marginTop: "30px", display: "flex", gap: "12px" }}>
          <button style={{ padding: "10px 20px", background: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }} onClick={() => { setEditingSpace(null); openModal(1); }}>チャット作成</button>
          <button style={{ padding: "10px 20px", background: "#16a34a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }} onClick={() => { setEditingSpace(null); openModal(2); }}>Todo作成</button>
          <button style={{ padding: "10px 20px", background: "#7c3aed", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }} onClick={() => { setEditingSpace(null); openModal(3); }}>質問作成</button>
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