import AiTutor from "@/components/tutor/ai-tutor";
import { getCurrentStudentId } from "@/lib/auth/current-user";
import { requireApiUser } from "@/lib/api/server";

export const metadata = {
  title: "AI Tutor — IELTS Beta",
};

export default async function TutorPage() {
  const user=await requireApiUser();const studentId=String(user.id);const firstName=user.firstName||user.username;

  return (
    <div className="px-4 py-8 md:px-8">
      <AiTutor userId={studentId ?? user?.id ?? "guest"} firstName={firstName} />
    </div>
  );
}