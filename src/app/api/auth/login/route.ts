import { NextResponse } from "next/server";
import {  registerUser } from "@/services/UserService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { MESSAGES } from "@/constants/messages";

export async function POST() {
    try {

        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ message: MESSAGES.AUTH001 }, { status: 401 });
        }

        const google_id = session.user.id;
        const email = session.user.email;

        if (!email) {
            return NextResponse.json({ message: MESSAGES.AUTH001 }, { status: 400 });
        }

        const user = await registerUser(google_id, email);
        
        return NextResponse.json({ 
            message: MESSAGES.USER001, 
            user: user 
        }, { status: 200 });
        
    } catch (error) {
        return NextResponse.json({ message: MESSAGES.AUTH003}, { status: 500 });
    }
}