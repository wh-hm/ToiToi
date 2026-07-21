export const messageMaster = {
  "朝": {
    charName: "しきじー",
    image: "/stamps/shikiji_default.png",
    normal: ["おはよう よく来たな 共に頑張ろう", "Good Morning!", "勉強しに来るとは偉いぞ！"],
    // 関数にして、使うときに値を渡せるようにする
    success: (days: number) => `おお！ 連続ログイン日数${days}日が達成したぞ！`
  },
  "昼": {
    charName: "といまる",
    image: "/stamps/toimaru_default.png",
    normal: ["こんにちは〜 今日も一緒に頑張ろうね〜", "ハロ〜 休憩してね〜", "お昼ご飯は食べた〜？"],
    success: (days: number) => `わ〜 連続で${days}日も来れて偉いね〜`
  },
  "夜": {
    charName: "フクロウ",
    image: "/stamps/hukurou_default.png",
    normal: ["ホー(こんばんは)", "ホーホー(夕飯は食べましたか？)", "ホーホーホー(とても偉いです)"],
    success: (days: number) => `ホー！（おめでとうございます。 連続ログイン日数${days}日が達成されました。）`
  }
} as const;