import { TopNav, type NavRole } from "@/components/shell/top-nav";
import { requireApiUser } from "@/lib/api/server";
import { publicMedia } from "@/lib/api/config";
import { userDisplayName } from "@/lib/user-display";

export async function AppShell({
  role,
  children,
}: {
  role: NavRole;
  children: React.ReactNode;
}) {
  const user=await requireApiUser();
  const displayName=userDisplayName(user);
  const avatarUrl=publicMedia(user.photo?.path);

  return (
    <div className="min-h-screen bg-paper">
      <TopNav role={role} displayName={displayName} avatarUrl={avatarUrl} />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
