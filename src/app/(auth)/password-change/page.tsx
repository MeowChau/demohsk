import { redirect } from "next/navigation";
export default async function Page({searchParams}:{searchParams:Promise<{hash?:string}>}){const {hash}=await searchParams;redirect(`/reset-password${hash?`?hash=${encodeURIComponent(hash)}`:""}`);}
