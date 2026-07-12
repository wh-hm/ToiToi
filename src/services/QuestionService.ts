import { prisma } from "@/lib/prisma";
import { Question } from "@prisma/client";
import sanitizeHtml from "sanitize-html"; // サニタイズ用ライブラリ
import { deleteQuestionChats } from "./QuestionChatService";
import { Prisma } from "@prisma/client";

export type Tx = Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

// 共通設定：HTMLタグを全除去してテキストとして保持する
const sanitizeOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

export async function checkQuestion(userId: string, spaceId: number, questionId: number, tx?: Tx): Promise<boolean> {
  const db = tx || prisma;
  const [question, space] = await Promise.all([
    db.question.findFirst({ where: { id: questionId, delete_flag: 0, user_id: userId } }),
    db.space.findFirst({ where: { id: spaceId, delete_flag: 0, user_id: userId } }),
  ]);
  return !!question && !!space;
}

/**
 * 質問の新規登録（サニタイズ実施版）
 */
export async function registerQuestion(
  spaceId: number, userId: string, title: string, question: string, tag: number | null
): Promise<Question> {
  const cleanTitle = sanitizeHtml(title, sanitizeOptions);
  const cleanQuestion = sanitizeHtml(question, sanitizeOptions);

  return await prisma.question.create({
    data: {
      space_id: spaceId,
      user_id: userId,
      title: cleanTitle,
      question: cleanQuestion,
      is_resolved: 0,
      delete_flag: 0,
      tag,
    },
  });
}

/**
 * 質問の編集更新（サニタイズ実施版）
 */
export async function updateQuestion(
  id: number, spaceId: number, userId: string, title: string, question: string, isResolved: number, tag: number | null, tx?: Tx
): Promise<Question> {
  const db = tx || prisma;
  const cleanTitle = sanitizeHtml(title, sanitizeOptions);
  const cleanQuestion = sanitizeHtml(question, sanitizeOptions);

  const result = await db.question.updateMany({
    where: { id, space_id: spaceId, user_id: userId, delete_flag: 0 },
    data: { title: cleanTitle, question: cleanQuestion, is_resolved: isResolved, tag },
  });

  if (result.count === 0) throw new Error("更新権限がないか、質問が存在しません。");
  return (await db.question.findUnique({ where: { id } }))!;
}

// 概要：スペースに紐づく有効な質問一覧を取得する
export async function getQuestions(spaceId: number, userId: string): Promise<Question[]> {
  return await prisma.question.findMany({
    where: { space_id: spaceId, user_id: userId, delete_flag: 0 },
    orderBy: { created_at: 'desc' },
  });
}

export async function getQuestion(questionId: number, userId: string): Promise<Question | null> {
  return await prisma.question.findFirst({
    where: { id: questionId, user_id: userId, delete_flag: 0 },
  });
}

// 概要：質問情報の削除
export async function deleteQuestion(questionId: number, spaceId: number, userId: string, tx?: Tx): Promise<Question> {
  const db = tx || prisma;
  const updatedQuestion = await db.question.update({
    where: { id: questionId },
    data: { delete_flag: 1 },
  });

  const activeChats = await db.questionChats.findMany({
    where: { question_id: questionId, delete_flag: 0 },
    select: { id: true },
  });

  if (activeChats.length > 0) {
    await deleteQuestionChats(activeChats.map(c => c.id), questionId, userId, db);
  }
  return updatedQuestion;
}

// 概要：質問情報の一括削除
export async function deleteQuestions(ids: number[], spaceId: number, userId: string, tx?: Tx): Promise<boolean> {
  const db = tx || prisma;
  if (!ids.length) return false;

  await db.question.updateMany({
    where: { id: { in: ids }, space_id: spaceId, user_id: userId, delete_flag: 0 },
    data: { delete_flag: 1 },
  });
  
  await db.questionChats.updateMany({
    where: { question_id: { in: ids }, delete_flag: 0 },
    data: { delete_flag: 1 },
  });
  
  return true;
}

/**
 * メソッド名称：updateQuestionStatus
 * 概要：質問の解決ステータス（解決済/未解決）を更新する
 */
export async function updateQuestionStatus(
  questionId: number, spaceId: number, userId: string, isResolved: number, tx?: Tx
): Promise<Question> {
  const db = tx || prisma;
  const result = await db.question.updateMany({
    where: { id: questionId, space_id: spaceId, user_id: userId, delete_flag: 0 },
    data: { is_resolved: isResolved },
  });

  if (result.count === 0) throw new Error("ステータス更新失敗");
  return (await db.question.findUnique({ where: { id: questionId } }))!;
}

/**
 * メソッド名称：getQuestionsCount
 * 概要：未解決の質問の個数を取得
 */

export async function getQuestionsCount(userId: string) {
  const [counts, spaces] = await Promise.all([
    prisma.question.groupBy({
      by: ['space_id'],
      where: { user_id: userId, is_resolved: 0, delete_flag: 0 },
      _count: { id: true },
    }),
    prisma.space.findMany({ where: { user_id: userId, delete_flag: 0 } }),
  ]);

  return spaces.map(space => ({
    space_id: space.id,
    space_name: space.name,
    question_count: counts.find(c => c.space_id === space.id)?._count.id || 0,
  }));
}