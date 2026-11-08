"use server";
import { redirect } from "next/navigation";
import { requireApiUser } from "@/lib/api/server";
export async function startAttemptAction(testid:string){await requireApiUser();if(!/^(set|exam)-\d+$/.test(testid))throw new Error("Mã bài luyện không hợp lệ.");redirect(`/practice/attempt/${testid}?testid=${encodeURIComponent(testid)}`);}
export async function submitAttemptAction(_data:FormData){throw new Error("Lịch sử bài thi chưa được backend HSK hỗ trợ.");}
