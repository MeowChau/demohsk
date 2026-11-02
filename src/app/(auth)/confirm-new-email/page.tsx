import { ConfirmEmailForm } from "@/components/auth/confirm-email-form";
export default async function Page({searchParams}:{searchParams:Promise<{hash?:string}>}){const {hash}=await searchParams;return <ConfirmEmailForm hash={hash} newEmail/>;}
