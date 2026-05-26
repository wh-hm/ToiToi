import { prisma } from "@/lib/prisma";
import { QuestionChats } from "@prisma/client";

//全チャット取得
export const getQuestionChats = async (id: string, question_id: number): Promise<QuestionChats[]> => {
    return await prisma.questionChats.findMany({
        where: {
            user_id: id,
            delete_flag: 0,
            question_id: question_id,
        },
    });
};

//チャットの新規作成
export const registerQuestionChat = async (data: {
    question_id: number;
    user_id: string;
    content?: string;    // 本文（任意）
    image_url?: string;  // 画像パス（任意）
    stamp?: string;      // スタンプ（任意）
}) => {
    return await prisma.questionChats.create({
        data: {
            user_id: data.user_id,
            content: data.content || null,
            image_url: data.image_url || null,
            stamp: data.stamp || null,
            // 外部キー関係
            question: {
                connect: { id: data.question_id }
            },
        },
    });
};

//チャット編集(テキストのみ)
export const updateQuestionChat = async (
  chatId: number, 
  question_id: number, 
  userId: string, 
  newMessage: string
) => {
    return await prisma.questionChats.update({
        where: { 
            id: chatId, 
            user_id: userId,    // セキュリティ：本人の投稿か確認
            question_id: question_id,
        },
        data: {
            content: newMessage, // 変更したい内容
        },
    });
};
//チャット削除
export const deleteQuestionChat = async (chatId: number, userId: string, question_id: number) => {
  // 3. 全て確認できたら、IDのみで安全に更新
  return await prisma.questionChats.update({
    where: { id: chatId,
            user_id: userId,
        question_id: question_id  },
    data: { delete_flag: 1 }
  });
};



