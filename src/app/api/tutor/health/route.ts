import { NextResponse } from "next/server";
export function GET(){return NextResponse.json({online:false,message:"General AI chat is not available on the existing HSK backend."});}
