export type PkQuestion = { id: number; hanzi: string; pinyin: string; prompt: string; options: { id: string; text: string }[] };
export type PkScore = { userId: number; score: number; correctCount: number; totalQuestions: number; combo: number };
export type PkMatch = {
  revision: number; roomId: string; users: number[];
  players: { id: number; name: string; photoUrl: string | null; hskLevel: number }[];
  readyUserIds: number[]; index: number; stage: "waiting" | "playing" | "reveal" | "finished";
  turnUserId: number; deadline: number; scores: PkScore[]; serverNow: number; questions: PkQuestion[];
};
export type PkAnswer = PkMatch & { userId: number; questionId: number; optionId: string | null; correct: boolean; correctOptionId: string };
export type PkResult = PkMatch & { winnerId: number | null; reason: string; durationInSeconds: number; rewards: { userId: number; expAwarded: number }[] };
export type PkCommand = { event: "find_match" | "cancel_match" | "player_ready" | "submit_answer"; hskLevel: number; roomId?: string; questionId?: number; optionId?: string };
const roomPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parsePkCommand(value: unknown): PkCommand {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Yêu cầu PK không hợp lệ.");
  const input = value as Record<string, unknown>;
  if (!Number.isInteger(input.hskLevel) || Number(input.hskLevel) < 1 || Number(input.hskLevel) > 9 || !["find_match", "cancel_match", "player_ready", "submit_answer"].includes(String(input.event))) throw new Error("Cấp độ hoặc thao tác PK không hợp lệ.");
  const command: PkCommand = { event: input.event as PkCommand["event"], hskLevel: Number(input.hskLevel) };
  if (command.event === "player_ready" || command.event === "submit_answer" || (command.event === "find_match" && input.roomId !== undefined)) {
    if (typeof input.roomId !== "string" || !roomPattern.test(input.roomId)) throw new Error("Mã phòng không hợp lệ.");
    command.roomId = input.roomId;
  }
  if (command.event === "submit_answer") {
    if (!Number.isSafeInteger(input.questionId) || Number(input.questionId) < 1 || typeof input.optionId !== "string" || !input.optionId || input.optionId.length > 128) throw new Error("Đáp án không hợp lệ.");
    command.questionId = Number(input.questionId); command.optionId = input.optionId;
  }
  return command;
}
export const validPkRoom = (value?: string | null) => typeof value === "string" && roomPattern.test(value) ? value : undefined;
