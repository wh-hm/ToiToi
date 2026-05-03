import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
    try {

    return NextResponse.json({ message: '送信完了' }, { status: 200 });
    } catch (err) {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
    }
}