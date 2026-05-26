import { prisma } from "@/lib/prisma";

export const registerLoginManagement = async (tx: any, user_id: string) => {
    await tx.loginManagement.create({
        data: {
        user_id: user_id,
        total_login_days: 1,
        current_streak: 1,
        },
    });
};

export const deleteLoginManagement = async (userId: string, tx: any) => {
  // updateMany を使うことで、データが0件でもエラーにならずに安全に処理されます
  await tx.loginManagement.updateMany({
    where: { 
        user_id: userId,
        delete_flag: 0 // 未削除のものだけを対象にする
    },
    data: {
        delete_flag: 1
    }
  });
};

//最終ログイン管理
export const updateLoginManagement = async (tx: any, userId: string) => {
  const currentData = await tx.loginManagement.findUnique({ where: { user_id: userId } });
  
  // 今日の日付 (時刻を0:00に揃える)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // 最終ログイン日時
  const lastLogin = new Date(currentData.last_login_at);
  lastLogin.setHours(0, 0, 0, 0);

  // 差分計算
  const diffDays = (today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);

  let newStreak = currentData.current_streak;
  if (diffDays === 1) {
    newStreak += 1; // 連続ログイン！
  } else if (diffDays > 1) {
    newStreak = 1;  // 途切れたのでリセット
  }

  // アップデート実行
  await tx.loginManagement.update({
    where: { user_id: userId },
    data: {
      last_login_at: new Date(), // 現在時刻
      total_login_days: { increment: 1 },
      current_streak: newStreak
    }
  });
};