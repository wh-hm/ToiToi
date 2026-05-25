
import { prisma } from "@/lib/prisma";
import { Question } from "@prisma/client";

//質問取得
export const getQuestions = async (id: string, space_id: number): Promise<Question[]> => {
    return await prisma.question.findMany({
        where: {
            user_id: id,
            delete_flag: 0,
            space_id: space_id,
        },
    });
};


//質問の新規作成
export const registerQuestion = async (
    user_id: string,   
    title: string,
    tag: number,
    question: string,
    space_id: number
): Promise<boolean> => {
    try {
        await prisma.question.create({
        data: {
            user_id: user_id,
            title: title,
            tag: tag,
            question: question,
            space_id: space_id,
            delete_flag: 0,
            is_resolved: 0
        },
        });
        return true;
    } catch (error) {
        console.error("スペース登録エラー:", error);
        return false;
    }
};



//質問の削除
export const deleteQuestion = async (id: number, userId: string, space_id: number) => {
  return await prisma.question.update({
    where: { id: id,
            space_id: space_id, // セキュリティ：そのスペース内のデータか確認
            user_id: userId  },
    data: { delete_flag: 1 }
  });
};




//質問の編集
export const updateQuestion = async (
  questionId: number, 
  spaceId: number, 
  title: string,
  is_resolved: number,
  userId: string, 
  question: string,
  tag: number,
) => {
    return await prisma.question.update({
        where: { 
            id: questionId,
            space_id: spaceId, // セキュリティ：そのスペース内のデータか確認
            user_id: userId    // セキュリティ：本人の投稿か確認
        },
        data: {
            title: title,
            is_resolved: is_resolved,
            question: question,
            tag: tag,
        },
    });
};

// 解決・未解決更新
export const updateQuestionStatus = async (id: number, userId: string, spaceId: number, isResolved: number) => {
    return await prisma.question.update({
        where: { 
        id: id,
        space_id: spaceId,
        user_id: userId 
        },
        data: { is_resolved: isResolved }
    });
};