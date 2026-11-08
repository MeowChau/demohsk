import { NextResponse } from "next/server";
export function GET(){return NextResponse.json({online:false,message:"Hệ thống hiện chưa hỗ trợ hội thoại AI chung."});}
