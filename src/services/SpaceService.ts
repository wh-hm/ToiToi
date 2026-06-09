import { prisma } from "@/lib/prisma";
import { Space } from "@prisma/client";
import { deleteChat } from "./ChatService";
import { deleteTask } from "./TaskService";
import { deleteQuestion } from "./QuestionService";

// 概要：ユーザーに紐づく有効なスペース一覧を取得する
export async function getSpaces(
  user_id: string,
  is_archived?: number | null,
  space_type?: number | null
): Promise<Space[]> {
  try {
    // 処理概要：スペーステーブル（space）から条件に一致した複数のレコードを検索（findMany）
    const spaces = await prisma.space.findMany({
      where: {
        user_id: user_id,
        delete_flag: 0, // 未削除の有効なスペースのみを対象とする
        // 引数がある場合のみ条件に含める（オプショナル引数の対応）
        ...(is_archived !== undefined && is_archived !== null && { is_archived }),
        ...(space_type !== undefined && space_type !== null && { space_type }),
      },
    });

    // 取得結果として、条件に一致したスペースレコードの配列を返却する
    return spaces as Space[];
  } catch (error) {
    // 例外処理：例外発生時は、呼び出し元にエラーをそのまま返し、画面側でのエラー表示処理に委ねる
    throw error;
  }
}

// 概要：スペースの登録
export async function registerSpace(
  user_id: string,
  name: string,
  space_type: number
): Promise<Space> {
  try {
    // 処理概要：引数の情報をもとに、スペーステーブル（spaces）に新規レコードを登録（create）
    const newSpace = await prisma.space.create({
      data: {
        user_id: user_id,       // 引数のuser_idを設定し、対象ユーザーと紐付けを行う
        name: name,             // 引数のnameを設定する
        space_type: space_type, // 引数のspace_typeを設定する
        delete_flag: 0,         // 初期値として有効状態を設定
      },
    });

    // 登録完了後、自動採番されたスペースID等を含む該当レコード1件分の全データを返却する
    return newSpace as Space;
  } catch (error) {
    // 例外処理：例外発生時は、呼び出し元にエラーをそのまま返し、画面側でのエラー表示処理に委ねる
    throw error;
  }
}


// 概要：スペースの変更
export async function updateSpace(
  id: number,
  name: string,
  user_id: string,
  favorite_flag?: number | null,
  is_archived?: number | null
): Promise<Space> {
  try {
    // 処理概要：引数のidをキーとして、スペーステーブル（spaces）の該当レコードを検索・一括更新（update）
    const updatedSpace = await prisma.space.update({
      where: {
        id: id,
        user_id: user_id,
        delete_flag: 0, // 条件：論理削除されていない、有効なスペースのみ
      },
      data: {
        name: name, // 更新データ：引数のname
        // 引数が渡された場合のみ更新（undefined の場合は既存の値を維持するPrismaの仕様を活用）
        ...(favorite_flag !== undefined && favorite_flag !== null && { favorite_flag }),
        ...(is_archived !== undefined && is_archived !== null && { is_archived }),
      },
    });

    // 更新完了後、すべての変更内容が反映された最新の該当スペースレコード1件分のデータを返却する
    return updatedSpace as Space;
  } catch (error) {
    // 例外処理：データベース接続エラー等の例外発生時は、呼び出し元（呼出元）にエラーをそのまま返し、画面側でのエラー表示処理に委ねる
    throw error;
  }
}

// 概要：スペース削除（論理削除）
export async function deleteSpace(
  space_id: number,   // 第1引数: int id
  space_type: string, // 第2引数: string type
  user_id: string,    // 第3引数: string user_id
  tx?: any            // トランザクション引き継ぎ用（オプション）
): Promise<boolean> {
  try {
    const db = tx || prisma;

    // 配下コンテンツの一掃（専門部隊への依頼）
    // メソッド内で space_type を判定し、専門部隊へバトンを渡す。
    // ※ 専門部隊（各個別削除関数）にも db (tx) を引き渡すことで、一連の削除が安全にコミット/ロールバックされます。
    if (space_type === 'CHAT') {
      await deleteSpaceChat(space_id, user_id, db);
    } else if (space_type === 'TASK') {
      await deleteSpaceTask(space_id, user_id, db);
    } else if (space_type === 'QUESTION') {
      await deleteSpaceQuestion(space_id, user_id, db);
    }

    // スペース自体の削除（論理削除）：
    // コンテンツ削除が正常完了したことを確認し、DB上のスペーステーブルにおいて、該当 space_id の delete_flag を「1」に更新する。
    await db.space.update({
      where: {
        id: space_id,
      },
      data: {
        delete_flag: 1, // 論理削除状態にする
      },
    });

    // 戻り値：全工程が正常終了したら true を返す。
    return true;
  } catch (error) {
    // 例外処理：データベース操作エラー
    console.error("スペース削除処理中にエラーが発生しました:", error);
    throw error; 
  }
}

// 概要：スペース一括削除、質問一括削除、チャット一括削除、タスク一括削除
export async function deleteSpaces(
  user_id: string,
  space_type: string, // "ALL", "CHAT", "TASK", "QUESTION" で受け取る
  tx?: any
): Promise<boolean> {
  try {
    const db = tx || prisma;

    const typeMapping: { [key: string]: number } = {
      "CHAT": 1,
      "TASK": 2,
      "QUESTION": 3
    };

    // 削除対象スペースの抽出条件（where句）を動的に構築
    const whereClause: any = {
      user_id: user_id,
      delete_flag: 0, // 有効なスペースのみ
    };

    // space_type が "ALL" でない場合は、int型の数値に変換して検索条件にセットする
    if (space_type !== "ALL") {
      const mappedTypeValue = typeMapping[space_type];
      
      if (mappedTypeValue === undefined) {
        throw new Error(`不正なspace_typeが指定されました: ${space_type}`);
      }
      
      whereClause.space_type = mappedTypeValue;
    }

    // スペーステーブルから、条件に一致する有効なスペースを検索
    const spaces = await db.space.findMany({
      where: whereClause,
      select: {
        id: true,
        space_type: true, // DBからは int型（1, 2, 3）で返ってくる
      },
    });

    // 2. ループによる「deleteSpace」の呼び出し
    for (const space of spaces) {
      let stringType = space_type;
      if (space_type === "ALL") {
        // DBから取得した int型 から文字列に逆変換
        stringType = Object.keys(typeMapping).find(key => typeMapping[key] === space.space_type) || "UNKNOWN";
      }

      // 個別の削除司令塔 `deleteSpace` を呼び出す
      await deleteSpace(space.id, stringType, user_id,  db);
    }

    return true;
  } catch (error) {
    // 例外処理
    console.error(`user_id: ${user_id} のスペース一括削除中にエラーが発生しました:`, error);
    return false;
  }
}


// 概要：スペースチャット一括削除
export async function deleteSpaceChat(
  space_id: number,
  user_id: string,
  tx?: any // 上位のトランザクションを引き継げるように設計
): Promise<boolean> {
  try {
    // トランザクションオブジェクトがある場合はそれを使用し、ない場合は通常のprismaクライアントを使用
    const db = tx || prisma;

    // 1. 全IDの抽出（メソッド内で完結）：
    // チャットサービス（またはchatsテーブル）から、対象 space_id に紐づく有効な（delete_flag=0）レコードをすべて検索する。
    const chats = await db.chat.findMany({
      where: {
        space_id: space_id,
        user_id: user_id, // セキュリティ担保のため、user_id も条件に含める
        delete_flag: 0,
      },
      // 取得した全レコードから「IDのリスト（chatIds）」を抽出するため、idのみを選択
      select: {
        id: true,
      },
    });

    const chatIdList = chats.map((chat: { id: number }) => chat.id);

    // 2. ループ処理開始 ＆ 3. 個別の削除実行：
    // 抽出した chatIds 配列の各要素（chatId）に対して、処理を繰り返す。
    for (const chatId of chatIdList) {
      // deleteChat(chatId, space_id, user_id) を呼び出す。
      // ※ これにより、各レコードごとの「画像削除判定」および「論理削除フラグ更新」が確実に行われる。
      await deleteChat(chatId, user_id, space_id);
    }

    // 4. 戻り値の返却：
    // すべての処理が正常に完了した場合は「true」を返す。
    return true;
  } catch (error) {
    // 例外処理：
    // 発生時の動作：データベース操作または画像削除においてエラーが発生した場合、try-catch にて捕捉する。
    console.error(`space_id: ${space_id} のチャット一括削除中にエラーが発生しました:`, error);
    // 呼び出し元の司令塔に異常を伝えるため、または設計書の戻り値型(bool)に合わせて false を返却
    return false;
  }
}

// 概要：タスクスペース削除（スペース内タスク一括削除）
export async function deleteSpaceTask(
  space_id: number, 
  user_id: string,
  tx?: any          // 上位のトランザクション（$transaction）を引き継げる設計
): Promise<boolean> {
  try {
    const db = tx || prisma;

    // 1. 全IDの抽出（メソッド内で完結）：
    // タスクテーブル（tasks）から、対象 space_id に紐づく有効な（delete_flag=0）レコードをすべて検索する。
    const tasks = await db.tasks.findMany({
      where: {
        space_id: space_id, 
        user_id: user_id,   
        delete_flag: 0,
      },
      // 取得した全レコードから「タスクIDのリスト」を抽出するため、idのみを選択
      select: {
        id: true,
      },
    });

    // 「タスクIDのリスト」を抽出する
    const taskIdList = tasks.map((task: { id: number }) => task.id);

    // 2. ループ処理開始 ＆ 3. 個別の削除実行：
    // 抽出した タスクIDリスト 配列の各要素（taskId）に対して、処理を繰り返す。
    for (const taskId of taskIdList) {
      // deleteTask(taskId, user_id, space_id) を呼び出す。
      // ※ 引数が最初から int型 なので、そのままストレートに渡せます。
      await deleteTask(taskId, user_id, space_id);
    }

    // 4. 戻り値の返却：
    // すべての処理が正常に完了した場合は「true」を返す。
    return true;
  } catch (error) {
    // 例外処理：
    // データベース操作でエラーが発生した場合は try-catch で捕捉し、ログ出力後に呼び出し元へ false を返却して異常を伝える。
    console.error(`space_id: ${space_id} のタスク一括削除中にエラーが発生しました:`, error);
    return false;
  }
}
// 概要：質問スペース削除
export async function deleteSpaceQuestion(
  space_id: number, // 引数: int
  user_id: string,  // 引数: string
  tx?: any          // トランザクションオブジェクト引き継ぎ用
): Promise<boolean> { // 戻り値: bool
  try {
    const db = tx || prisma;

    // 1. 全質問IDの抽出（メソッド内で完結）：
    // 質問テーブルから、対象 space_id に紐づく有効な（delete_flag=0）レコードをすべて検索する。
    const questions = await db.questions.findMany({
      where: {
        space_id: space_id,
        user_id: user_id,
        delete_flag: 0
      },
      select: {
        id: true // IDのリストを抽出
      }
    });

    // 2. 質問の連動削除（二重のバケツリレー）：
    // 各質問IDに対して、上で作成した「deleteQuestion」のロジックを再利用して、個別に論理削除する。
    for (const q of questions) {
      // 修正ポイント：チャットの直ループではなく、設計書通り単体削除メソッドへ完全に委譲する
      await deleteQuestion(q.id, space_id, user_id, db);
    }

    // 3. 戻り値の返却：
    // すべての処理が正常に完了した場合は「true」を返す。
    return true;

  } catch (error) {
    // 例外処理：
    // データベース操作でエラーが発生した場合は try-catch で捕捉し、ログ出力後に呼び出し元へ false を返却して異常を伝える。
    console.error(`space_id: ${space_id} の質問スペース一括削除中にエラーが発生しました:`, error);
    return false;
  }
}


/**
 * メソッド名称：deleteArchives
 * 概要：アーカイブ一括削除
 */
export async function deleteArchives(
  user_id: string, // 引数: string
  tx?: any         // トランザクションオブジェクト引き継ぎ用
): Promise<boolean> { // 戻り値: bool
  try {
    const db = tx || prisma;

    // 1. 抽出：
    // 既存の getSpaces メソッドを呼び出し、引数で { is_archived: 1, user_id: user_id } を渡して取得する。
    // ※ 既存の getSpaces が tx (db) を受け取れるようになっているか、あるいは prisma 経由で取得します。
    // ここでは、定義済みの getSpaces をベースに、アーカイブ済み（is_archived: 1）のスペース一覧を抽出します。
    const archivedSpaces = await getSpaces(user_id, 1, null);

    // 2. ループ：
    // 取得したスペースリストの各要素について、以下の手順を繰り返す。
    for (const space of archivedSpaces) {
      
      // 3. 実行：
      // deleteSpace(space.id, space.type, user_id) を呼び出す。
      // ※ 設計書の引数順序（space.id, space.type, user_id）に準拠しつつ、
      // 既存の deleteSpace(space_type, user_id, space_id, tx) の定義と型を合わせてバケツリレーします。
      
      // space_type（数字型: 1, 2, 3）から、deleteSpace が期待する文字列型（'CHAT' | 'TASK' | 'QUESTION'）に変換
      let typeString = "ALL";
      if (space.space_type === 1) typeString = "CHAT";
      if (space.space_type === 2) typeString = "TASK";
      if (space.space_type === 3) typeString = "QUESTION";

      const isSuccess = await deleteSpace(space.id, typeString, user_id, db);
      
      if (!isSuccess) {
        // どこか1つでも削除に失敗した場合は、必要に応じてエラーを投げてトランザクションをロールバックさせるか、
        // 設計書の例外処理方針に合わせて catch 側へ飛ばします。
        throw new Error(`space_id: ${space.id} の削除に失敗しました。`);
      }
    }

    // すべてのループが正常に完了したら true を返す
    return true;

  } catch (error) {
    // 例外処理：
    // データベース操作でエラーが発生した場合は try-catch で捕捉し、ログ出力後に呼び出し元へ false を返却して異常を伝える。
    console.error(`user_id: ${user_id} のアーカイブ一括削除中にエラーが発生しました:`, error);
    return false;
  }
}