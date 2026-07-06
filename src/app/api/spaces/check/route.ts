// src/app/api/spaces/check/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-guard";
import { getSpaceCheck } from "@/services/SpaceService";
import { MESSAGES } from "@/constants/messages";

export async function GET(request: NextRequest) {
    const auth = await getAuthContext();
    if ('error' in auth) return NextResponse.json({ message: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const space_id = Number(searchParams.get("space_id"));

    try {
        const isSpaceAlive = await getSpaceCheck(auth.user_id, space_id);
        if (!isSpaceAlive) {
            return NextResponse.json({ message: MESSAGES.E1010("対象のスペース") }, { status: 404 });
        }
        return NextResponse.json({ alive: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "エラー" }, { status: 500 });
    }
}