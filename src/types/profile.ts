export interface ProfileDetail {
  userid: string;
  email: string;
  username: string;
  role: "student" | "teacher" | "admin";
  display_id: string | null;
  created_at: string;
  personid: string;
  dob: string | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  target_band: number | null;
  current_band: number | null;
  daily_study_time: number | null;
}

export interface UserSettings {
  userid: string;
  email_notifications: boolean;
  streak_reminders: boolean;
}
