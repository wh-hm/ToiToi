import { prisma } from "@/lib/prisma";

// ==========================================
// 1. ユーザーの現在のログイン状況を取得する
// ==========================================
export const getLoginManagement = async (
  user_id: string, // 引数: string user_id
  tx?: any
): Promise<any> => { // 戻り値: LoginManagement
  try {
    const db = tx || prisma;

    // ・引数の user_id を主キーとしてログイン管理テーブルを検索する。
    const data = await db.loginManagement.findUnique({
      where: { user_id: user_id }
    });

    // ・レコードが存在しない場合は、このユーザーが初回ログインであるとみなし、デフォルト値（累計1日、連続1日、現在日時）を返却
    // ※ 💡注意: 設計書の「処理概要」ではデフォルト値を返却とありますが、下の「例外処理」では「nullを返却または例外をスローし、呼び出し元で『ログイン状況取得不可』として画面にエラーを通知する」とあるため、例外処理の指示を優先してエラーを投げます。
    if (!data) {
      throw new Error("ログイン状況取得不可");
    }
    return data;
  } catch (error: any) {
    // 例外処理: nullを返却または例外をスロー
    console.error(`user_id: ${user_id} のログイン状況取得に失敗しました:`, error);
    throw error;
  }
};

// ==========================================
// 2. ユーザーの初回ログイン時にログイン管理レコードを初期登録する
// ==========================================
export const registerLoginManagement = async (
  user_id: string, // 引数: string user_id
  tx?: any
): Promise<any> => { // 戻り値: Goal (※設計書ママ)
  try {
    const db = tx || prisma;

    // ・ログイン管理テーブルへ新規レコードを作成する。
    // ・初期値：累計ログイン日数=1、連続ログイン日数=1、最終ログイン=現在日時、削除フラグ=0。
    return await db.loginManagement.create({
      data: {
        user_id: user_id,
        total_login_days: 1, // 累計ログイン日数=1
        current_streak: 1,   // 連続ログイン日数=1
        last_login_at: new Date(), // 最終ログイン=現在日時
        delete_flag: 0,      // 削除フラグ=0
      },
    });
  } catch (error) {
    // 例外処理: ログを出力し、呼び出し元へエラーを投げて「登録失敗」を画面へフィードバックする。
    console.error("ログイン管理レコードの初期登録に失敗しました:", error);
    throw new Error("登録失敗");
  }
};

// ==========================================
// 3. ユーザー退会時等にログイン管理情報を論理削除する
// ==========================================
export const deleteLoginManagement = async (
  user_id: string, // 引数: string user_id
  tx?: any
): Promise<boolean> => { // 戻り値: bool
  try {
    const db = tx || prisma;

    // ・引数の user_id に該当するレコードの delete_flag を 1 に更新する。
    const result = await db.loginManagement.updateMany({
      where: { 
        user_id: user_id,
        delete_flag: 0 
      },
      data: {
        delete_flag: 1,
        current_streak: 1,
        total_login_days: 1
      }
    });

    return result.count > 0;
  } catch (error) {
    // 例外処理: コンソールに詳細エラーログを出力し、呼び出し元へ false（または例外）を返却する。
    console.error(`user_id: ${user_id} の論理削除中に詳細エラーが発生しました:`, error);
    return false;
  }
};

// ==========================================
// 4. 設定済みの目標内容、または目標達成状況（ステータス）を更新する (ログイン管理日付判定)
// ==========================================
// export const updateLoginManagement = async (
//   user_id: string,
//   total_login_days?: number | null,
//   delete_flag?: number | null, // これを確実に処理する
//   tx?: any
// ): Promise<any> => {
//   try {
//     const db = tx || prisma;

//     const currentData = await db.loginManagement.findUnique({ 
//       where: { user_id: user_id } 
//     });
    
//     if (!currentData) {
//       return await registerLoginManagement(user_id, db);
//     }
    
//     // 現在の streak / total を取得
//     let newStreak = currentData.current_streak;
//     let newTotalDays = currentData.total_login_days;

//     // 日付判定ロジック
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     const lastLogin = new Date(currentData.last_login_at);
//     lastLogin.setHours(0, 0, 0, 0);
//     const diffDays = (today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);

//     if (diffDays !== 0) {
//       newTotalDays += 1;
//       if (diffDays === 1) {
//         newStreak += 1;
//       } else {
//         newStreak = 1;
//       }
//     }

//     // ★ここで delete_flag を確実に 0 に戻す処理を追加
//     return await db.loginManagement.update({
//       where: { user_id: user_id },
//       data: {
//         last_login_at: new Date(),
//         total_login_days: newTotalDays,
//         current_streak: newStreak,
//         delete_flag: delete_flag !== undefined && delete_flag !== null ? delete_flag : currentData.delete_flag
//       }
//     });
//   } catch (error) {
//     console.error(`user_id: ${user_id} のログイン更新エラー:`, error);
//     throw error; // false を返すよりエラーを投げる方が安全
//   }
// };



// export const updateLoginManagement = async (
//   user_id: string,
//   total_login_days?: number | null,
//   delete_flag?: number | null, 
//   tx?: any
// ): Promise<any> => {
//   try {
//     const db = tx || prisma;

//     const currentData = await db.loginManagement.findUnique({ 
//       where: { user_id: user_id } 
//     });
    
//     if (!currentData) {
//       return await registerLoginManagement(user_id, db);
//     }
    
//     let newStreak = currentData.current_streak;
//     let newTotalDays = currentData.total_login_days;

//     // 日付判定ロジック
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
//     const lastLogin = new Date(currentData.last_login_at);
//     lastLogin.setHours(0, 0, 0, 0);
//     const diffDays = (today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);

//     if (diffDays !== 0) {
//       newTotalDays += 1;
//       if (diffDays === 1) {
//         newStreak += 1;
//       } else {
//         newStreak = 1;
//       }
//     }

//     // ★改善ポイント：delete_flag の更新ロジックを整理
//     // 引数で明示的に指定があればそれを優先し、なければ強制的に 0 (アクティブ) に戻す
//     const nextDeleteFlag = delete_flag !== undefined && delete_flag !== null 
//       ? delete_flag 
//       : 0; 

//     return await db.loginManagement.update({
//       where: { user_id: user_id },
//       data: {
//         last_login_at: new Date(),
//         total_login_days: total_login_days ?? newTotalDays, // 引数があればそれを使う
//         current_streak: newStreak,
//         delete_flag: nextDeleteFlag
//       }
//     });
//   } catch (error) {
//     console.error(`user_id: ${user_id} のログイン更新エラー:`, error);
//     throw error;
//   }
// };



export const updateLoginManagement = async (
  user_id: string,
  tx?: any
): Promise<any> => { // 引数から total_login_days を削除
  try {
    const db = tx || prisma;

    const currentData = await db.loginManagement.findUnique({ 
      where: { user_id: user_id } 
    });
    
    if (!currentData) {
      return await registerLoginManagement(user_id, db);
    }
    
    let newStreak = currentData.current_streak;
    let newTotalDays = currentData.total_login_days;
    const now = new Date();
    
    // 日付判定ロジック
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const lastLogin = new Date(currentData.last_login_at);
    lastLogin.setHours(0, 0, 0, 0);
    
    // getTime() で比較する際、タイムゾーンのずれを考慮して
    // 日付の差分を計算（整数化）
    const diffDays = Math.floor((today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      // 日付が変わっている場合のみカウントアップ
      newTotalDays += 1;
      
      if (diffDays === 1) {
        newStreak += 1; // 連続ログイン
      } else {
        newStreak = 1;  // 途切れたのでリセット
      }
    }

    return await db.loginManagement.update({
      where: { user_id: user_id },
      data: {
        last_login_at: now, // 現在時刻で更新
        total_login_days: newTotalDays, // 計算した値を使う
        current_streak: newStreak,
        delete_flag: 0 // ログインしたなら確実にアクティブ
      }
    });
  } catch (error) {
    console.error(`user_id: ${user_id} のログイン更新エラー:`, error);
    throw error;
  }
};