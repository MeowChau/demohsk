import { AppShell } from "@/components/shell/app-shell";
import { requireApiUser } from "@/lib/api/server";
export default async function Layout({children}:{children:React.ReactNode}){await requireApiUser();return <AppShell role="student">{children}</AppShell>;}
