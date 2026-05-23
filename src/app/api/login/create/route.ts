import { NextResponse } from "next/server";
import { existsUser, registerUsername, updateUsername } from "@/services/UserService";

export async function POST(request: Request) {
    try {
        const { google_id, email } = await request.json();

        if (!google_id) {
        return NextResponse.json({ error: "IDが必要です" }, { status: 400 });
        }

        // 1. ユーザーが存在するかチェック
        const existingId = await existsUser(google_id);
        
        if (!existingId) {
        // 2. 存在しなければ初期作成（emailが必須と仮定）
        await registerUsername(google_id, email || "");
        return NextResponse.json({ message: "新規登録しました", created: true }, { status: 201 });
        }
        return NextResponse.json({ message: "ユーザーは既に存在します", created: false }, { status: 200 });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
    }
}