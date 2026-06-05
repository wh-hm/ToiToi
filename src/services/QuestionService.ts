import { prisma } from "@/lib/prisma";
import { Question } from "@prisma/client";
import { deleteQuestionChats } from "./QuestionChatService";
import sanitizeHtml from "sanitize-html"; // サニタイズ用ライブラリ

// 共通設定：HTMLタグを全除去してテキストとして保持する
const sanitizeOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

/**
 * 質問の新規登録（サニタイズ実施版）
 */
export async function registerQuestion(
  space_id: number,
  user_id: string,
  title: string,
  question: string,
  tag: number | null,
  tx?: any,
): Promise<any> {
  try {
    const db = tx || prisma;

    if (typeof space_id !== 'number' || Number.isNaN(space_id)) {
      throw new Error("space_idが数値ではありません");
    }

    // 1. サニタイズ実施
    const cleanTitle = sanitizeHtml(title, sanitizeOptions);
    const cleanQuestion = sanitizeHtml(question, sanitizeOptions);

    // 2. レコード登録
    const newQuestion = await db.questions.create({
      data: {
        space_id,
        user_id,
        title: cleanTitle,
        question: cleanQuestion,
        is_resolved: 0,
        delete_flag: 0,
        tag,
        created_at: new Date(),
      },
    });

    return newQuestion;
  } catch (error) {
    console.error("質問の新規登録中にエラーが発生しました:", error);
    throw error;
  }
}

/**
 * 質問の編集更新（サニタイズ実施版）
 */
export async function updateQuestion(
  id: number,
  space_id: number,
  user_id: string,
  title: string,
  question: string,
  is_resolved: number,
  tag: number | null,
  tx?: any
): Promise<any> {
  try {
    const db = tx || prisma;

    // 1. サニタイズ実施
    const cleanTitle = sanitizeHtml(title, sanitizeOptions);
    const cleanQuestion = sanitizeHtml(question, sanitizeOptions);

    const result = await db.questions.updateMany({
      where: { id, space_id, user_id, delete_flag: 0 },
      data: {
        title: cleanTitle,
        question: cleanQuestion,
        is_resolved,
        tag,
      },
    });

    if (result.count === 0) {
      throw new Error("対象の質問が存在しないか、編集権限がありません。");
    }

    return await db.questions.findUnique({ where: { id } });
  } catch (error) {
    console.error(`question_id: ${id} の更新中にエラーが発生しました:`, error);
    throw error;
  }
}

// 概要：スペースに紐づく有効な質問一覧を取得する
export async function getQuestions(
    space_id: number, // 引数: int
    user_id: string,  // 引数: string
    tx?: any
    ): Promise<any[]> { // 戻り値: Question[]
    try {
        const db = tx || prisma;

        // 1. 質問一覧の検索 (findMany)
        const questions = await db.questions.findMany({
        where: {
            space_id: space_id, // space_id=引数のspace_id
            user_id: user_id,   // user_id=引数のuser_id
            delete_flag: 0,     // delete_flag=0 (削除されていない、有効な質問のみ)
        },
        // 3. ソート条件：登録日時 (created_at) の降順（新しい順）
        orderBy: {
            created_at: 'desc',
        },
        });

        // 4. 戻り値の返却：条件に一致した質問レコードの配列
        return questions;
    } catch (error) {
        // 例外処理：データベース接続エラー等の例外発生時は、エラーをそのまま返し、画面側でのエラー表示処理に委ねる。
        console.error(`space_id: ${space_id} の質問一覧取得中にエラーが発生しました:`, error);
        throw error;
    }
}

// 概要：質問情報の削除
export async function deleteQuestion(
    id: number,
    space_id: number,
    user_id: string,
    tx?: any
): Promise<any> {
  try {
    const db = tx || prisma;

    // 1. 質問レコードの論理削除（update）：
    // 質問マスタ（questions）から条件に一致するレコードの delete_flag を 1 に更新する。
    const updatedQuestion = await db.questions.update({
      where: {
        id: id,
        space_id: space_id,
        user_id: user_id,
        delete_flag: 0, // 有効なレコードのみ対象
      },
      data: {
        delete_flag: 1, // 論理削除フラグを立てる
      },
    });

    // 2. 関連するチャットメッセージの一括連動削除：
    // 該当質問（id）に紐づいている有効なチャットメッセージのIDをすべて取得する。
    const activeChats = await db.questionChats.findMany({
      where: {
        question_id: id,
        delete_flag: 0,
      },
      select: { id: true },
    });

    if (activeChats.length > 0) {
      const chatIds = activeChats.map((c: any) => c.id);
      // 質問チャット一括削除サービスを呼び出す
      await deleteQuestionChats(chatIds, id, user_id, db);
    }

    // 3. 戻り値の返却：論理削除が完了した最新の質問レコード1件分を返却
    return updatedQuestion;

  } catch (error) {
    // 例外処理：エラー時は例外をそのまま投げ、画面側（コントローラー側）に処理を委ねる
    console.error(`question_id: ${id} の論理削除中にエラーが発生しました:`, error);
    throw error;
  }
}

// 概要：質問情報の一括削除
export async function deleteQuestions(
  ids: number[] | null, // 引数: int[] ids
  space_id: number,     // 引数: int spacce_id
  user_id: string,      // 引数: string user_id
  tx?: any              // トランザクション引き継ぎ用（任意）
): Promise<boolean> {   // 戻り値: bool
  try {
    const db = tx || prisma;

    // 処理ステップ 1. 局所化バリデーション：
    // 引数の ids 配列が空、または null の場合は、処理を行わず呼び出し元に false を返却する。
    if (!ids || ids.length === 0) {
      return false;
    }

    // 処理ステップ 2 & 3 & 4. ループによる単体削除の実行：
    // 渡された配列の要素数分だけループ処理を行い、単一の質問ID（id）に対して deleteQuestion を引き渡して実行する。
    for (const id of ids) {
      await deleteQuestion(
        id,
        space_id,
        user_id,
        db, // 同一トランザクションで実行させて安全性を担保
      );
    }

    // すべての質問IDに対するループ処理がエラーなく正常に終了した場合、呼び出し元へ true を返却する。
    return true;

  } catch (error) {
    // 例外処理：データベース更新中やチャット削除ループの実行中にエラー（例外）が発生した場合、
    // 処理を中断して呼び出し元（呼出元）にエラーをそのまま返却し、画面側でのエラーハンドリングに委ねる。
    console.error(`space_id: ${space_id} の質問一括削除中に例外が発生しました:`, error);
    throw error;
  }
}



/**
 * メソッド名称：updateQuestionStatus
 * 概要：質問の解決ステータス（解決済/未解決）を更新する
 */
export async function updateQuestionStatus(
    id: number,
    space_id: number,
    user_id: string,
    is_resolved: number,
    tx?: any,
): Promise<any> { // 戻り値: Question
  try {
    const db = tx || prisma;

    // 1. 引数の id、space_id、user_id をキーとして対象の質問レコードを特定し、解決済みフラグ（is_resolved）のみをピンポイントで更新（update）する。
    // 検索・更新条件（where句）: id=引数のid, space_id=引数のspace_id, user_id=引数のuser_id, delete_flag=0
    const result = await db.questions.updateMany({
      where: {
        id: id,
        space_id: space_id,
        user_id: user_id,
        delete_flag: 0,
      },
      // 更新データ（data）: is_resolved = 引数の is_resolved
      data: {
        is_resolved: is_resolved,
      },
    });

    // 例外処理：該当する質問が存在しない場合のハンドリング
    if (result.count === 0) {
      throw new Error("対象の質問が存在しないか、ステータスを変更する権限がありません。");
    }

    // 2. 引数で渡された新しい is_resolved（0または1）を該当レコードの is_resolved カラムに反映（update）する。
    // 更新完了後、解決ステータスの変更が反映された最新の質問レコード1件分のデータを呼び出し元へ返却する。
    const updatedRecord = await db.questions.findUnique({
      where: { id: id },
    });

    return updatedRecord;
  } catch (error) {
    // 例外処理：該当する質問が存在しない（他人の質問である、または既に削除済等）、あるいはデータベース接続エラー等の例外発生時は、呼び出し元（呼出元）にエラーをそのまま返し、画面側でのエラー表示処理に委ねる。
    console.error(`question_id: ${id} の解決ステータス更新中にエラーが発生しました:`, error);
    throw error;
  }
}


/**
 * メソッド名称：getQuestionsCount
 * 概要：未解決の質問の個数を取得
 */
export async function getQuestionsCount(
    space_id: number,
    user_id: string,
    tx?: any

): Promise<number> { // 戻り値: int
  try {
    const db = tx || prisma;

    // 1. 質問マスタ（questions）に対して、指定の条件を満たすレコードの集計（count）を要求する。
    // 検索・カウント条件（where句）
    const count = await db.questions.count({
      where: {
        space_id: space_id,     // space_id = 引数の space_id
        is_resolved: 0,         // is_resolved = 0（解決済みフラグが「未解決」の状態）
        delete_flag: 0,         // delete_flag = 0（削除されていない有効な質問のみ）
        // ユーザー自身のスペース内、または閲覧権限のバリデーションとしてuser_idが必要な場合はここに追記します
      },
    });

    // 2. データベースから返ってきた件数（数値型）を、そのまま呼び出し元へ返却する。
    return count;

  } catch (error) {
    // 例外処理：データベース接続エラー等の例外発生時は、呼び出し元（呼出元）にエラーをそのまま返し、画面側でのエラーハンドリングに委ねる。
    console.error(`space_id: ${space_id} の未解決質問数カウント中にエラーが発生しました:`, error);
    throw error;
  }
}