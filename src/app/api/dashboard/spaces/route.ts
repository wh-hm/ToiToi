import { NextResponse } from "next/server";
import { getSpaces } from "@/services/SpaceService";
import { getUserId } from "@/services/UserService"; // ★これが必要！

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const googleId = searchParams.get("userId");

    if (!googleId) {
        return NextResponse.json({ error: "userIdが必要です" }, { status: 400 });
    }
    
    // 1. Google ID を DB 上のユーザー ID に変換する
    const dbUserId = await getUserId(googleId);

    // 2. ユーザーが見つからない場合は空のリストを返す
    if (!dbUserId) {
        return NextResponse.json({ type1: [], type2: [], type3: [] });
    }

    // 3. 変換した DB ID を使ってスペースを取得する
    const spaces = await getSpaces(dbUserId);

    const result = {
        type1: spaces.filter(s => s.space_type === 1),
        type2: spaces.filter(s => s.space_type === 2),
        type3: spaces.filter(s => s.space_type === 3),
    };

    return NextResponse.json(result);
}