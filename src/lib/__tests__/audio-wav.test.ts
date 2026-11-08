import { encodeStudyWav } from "../audio-wav";
const ascii = (buffer: ArrayBuffer, start: number, length: number) => String.fromCharCode(...new Uint8Array(buffer, start, length));
describe("HSK pronunciation audio contract", () => {
  it("writes a valid mono PCM16 16 kHz RIFF header", () => {
    const result = encodeStudyWav([new Float32Array(48000).fill(0.5)], 48000);
    const view = new DataView(result);
    expect(ascii(result, 0, 4)).toBe("RIFF"); expect(ascii(result, 8, 4)).toBe("WAVE");
    expect(view.getUint16(20, true)).toBe(1); expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16000); expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(32000); expect(result.byteLength).toBe(32044);
  });
  it("mixes stereo channels and clips amplitudes safely", () => {
    const mono = encodeStudyWav([new Float32Array(160).fill(1), new Float32Array(160).fill(-1)], 16000);
    expect(new DataView(mono).getInt16(44, true)).toBe(0);
    const loud = encodeStudyWav([new Float32Array(160).fill(2)], 16000);
    expect(new DataView(loud).getInt16(44, true)).toBe(32767);
  });
  it("keeps recordings within the backend's thirty-second data cap", () => {
    const result = encodeStudyWav([new Float32Array(16000 * 30.1)], 16000);
    expect(result.byteLength).toBe(960044);
  });
  it("rejects long or empty audio rather than submitting invalid data", () => {
    expect(() => encodeStudyWav([new Float32Array(16000 * 31)], 16000)).toThrow();
    expect(() => encodeStudyWav([], 16000)).toThrow();
    expect(() => encodeStudyWav([new Float32Array(100)], 0)).toThrow();
  });
});
