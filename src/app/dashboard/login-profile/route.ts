import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

  // ★ 本来はDBから取得するが、今は仮データを返す
  return NextResponse.json({
    continuousDays: 3,
  });
}
