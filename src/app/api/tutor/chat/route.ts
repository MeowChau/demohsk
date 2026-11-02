import { NextResponse } from "next/server";
export function POST(){return NextResponse.json({error:"Hội thoại AI chưa được hỗ trợ trên backend HSK hiện tại."},{status:503});}
