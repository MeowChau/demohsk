import { parsePkCommand } from "@/types/pk";
const roomId = "6caec492-df62-4013-83a4-bb557c563846";
describe("PK gateway command contract", () => {
  it("forwards only the answer fields accepted by the backend", () => {
    expect(parsePkCommand({ event: "submit_answer", hskLevel: 3, roomId, questionId: 10, optionId: "B", userId: 999, score: 99999, token: "not-allowed" })).toEqual({ event: "submit_answer", hskLevel: 3, roomId, questionId: 10, optionId: "B" });
  });
  it.each([
    { event: "admin_update", hskLevel: 1 }, { event: "find_match", hskLevel: 10 },
    { event: "player_ready", hskLevel: 1, roomId: "../other-room" },
    { event: "submit_answer", hskLevel: 1, roomId, questionId: 0, optionId: "A" },
    { event: "submit_answer", hskLevel: 1, roomId, questionId: 1, optionId: "" },
  ])("rejects malformed or unauthorized commands %j", command => expect(() => parsePkCommand(command)).toThrow());
  it("allows finding and cancelling matches without fabricated room IDs", () => {
    expect(parsePkCommand({ event: "find_match", hskLevel: 1 })).toEqual({ event: "find_match", hskLevel: 1 });
    expect(parsePkCommand({ event: "cancel_match", hskLevel: 1 })).toEqual({ event: "cancel_match", hskLevel: 1 });
  });
});
