import { z } from "zod";
export type PkQuestion = { id: number; hanzi: string; pinyin: string; prompt: string; options: { id: string; text: string }[] };
export type PkScore = { userId: number; score: number; correctCount: number; totalQuestions: number; combo: number };
export type PkMatch = {
  revision: number; roomId: string; users: number[];
  players: { id: number; name: string; photoUrl: string | null; hskLevel: number }[];
  readyUserIds: number[]; index: number; stage: "waiting" | "playing" | "reveal" | "finished";
  turnUserId: number; deadline: number; scores: PkScore[]; serverNow: number; questions: PkQuestion[];
};
export type PkAnswer = Omit<PkMatch,"questions"> & { userId: number; questionId: number; optionId: string | null; correct: boolean; correctOptionId: string };
export type PkResult = Omit<PkMatch,"questions"> & { winnerId: number | null; reason: string; durationInSeconds: number; rewards: { userId: number; expAwarded: number }[] };
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

const id=z.number().int().positive();
const count=z.number().int().nonnegative();
const question=z.object({id,hanzi:z.string(),pinyin:z.string(),prompt:z.string(),options:z.array(z.object({id:z.string(),text:z.string()})).min(2)});
const room=z.object({revision:count,roomId:z.string().uuid(),users:z.array(id).length(2).refine(users=>new Set(users).size===2),
  players:z.array(z.object({id,name:z.string(),photoUrl:z.string().nullable(),hskLevel:id})),
  readyUserIds:z.array(id),index:count,stage:z.enum(["waiting","playing","reveal","finished"]),
  turnUserId:id,deadline:count,serverNow:count,
  scores:z.array(z.object({userId:id,score:z.number().finite(),correctCount:count,totalQuestions:count,combo:count})),
});
const pkEnvelope=z.discriminatedUnion("event",[
 z.object({event:z.literal("connecting"),payload:z.null()}),
 z.object({event:z.enum(["pk_connected","online_count_update"]),payload:z.object({count,hskLevel:id.optional()})}),
 z.object({event:z.enum(["connection_closed","connection_error","exception"]),payload:z.object({message:z.string().optional()})}),
 z.object({event:z.literal("match_cancelled"),payload:z.object({roomId:z.string().uuid(),message:z.string().optional()})}),
 z.object({event:z.enum(["match_found","player_ready_update","game_started","turn_changed"]),payload:room.extend({questions:z.array(question).optional()})}),
 z.object({event:z.literal("answer_result"),payload:room.extend({userId:id,questionId:id,optionId:z.string().nullable(),correct:z.boolean(),correctOptionId:z.string()})}),
 z.object({event:z.literal("game_finished"),payload:room.extend({winnerId:id.nullable(),reason:z.string(),durationInSeconds:count,rewards:z.array(z.object({userId:id,expAwarded:count}))})}),
]);
export function parsePkMessage(value:unknown){const parsed=pkEnvelope.safeParse(value);return parsed.success?parsed.data:null;}
export function pkStorageKey(origin:string,userId:number,level:number){return `hsk:pk-room:${encodeURIComponent(origin)}:${userId}:${level}`;}
