import { requireApiUser } from "@/lib/api/server";
import { profileDetail } from "@/lib/api/learning";
import { AvatarUploader } from "./avatar-uploader";
import { PersonalInfoForm } from "./personal-info-form";
import { ChangePasswordForm, DeleteAccountSection } from "./settings-forms";
import { ProfileTabs } from "./profile-tabs";
import { userDisplayName } from "@/lib/user-display";

export default async function ProfilePage() {
  const user = await requireApiUser();
  const profile = profileDetail(user);

  if (!profile) return <p className="text-sm text-slate"> Không tìm thấy hồ sơ. </p>;

  const displayName = userDisplayName(user);
  const initials = displayName.trim().split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-[var(--mist)] bg-surface p-6 shadow-card dark:border-slate/20 dark:bg-navy-deep">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <AvatarUploader currentUrl={profile.avatar_url} initials={initials} />
          <div className="text-left sm:text-right">
            <p className="font-display text-lg font-bold text-[var(--ink)] dark:text-white">
              {displayName}
            </p>
            <p className="text-xs uppercase tracking-wide text-[var(--slate-soft)]">{profile.role === "student" ? "Học viên" : profile.role === "teacher" ? "Giáo viên" : "Quản trị viên"}</p>
            {profile.display_id && (
              <p className="mt-0.5 font-mono text-xs font-bold text-[var(--teal)]">{profile.display_id}</p>
            )}
          </div>
        </div>

        <ProfileTabs
          personalInfo={
            <PersonalInfoForm key={profile.current_band} profile={profile} />
          }
          settings={
            <div className="flex flex-col gap-6">

              <div className="border-t border-[var(--mist)] pt-6">
                <h3 className="mb-3 text-sm font-bold text-[var(--ink)] dark:text-white"> Đổi mật khẩu </h3>
                <ChangePasswordForm />
              </div>
              <div className="border-t border-[var(--mist)] pt-6">
                <DeleteAccountSection />
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
