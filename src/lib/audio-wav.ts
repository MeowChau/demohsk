/** Convert decoded audio to the backend's mono PCM16 / 16 kHz WAV contract. */
export function encodeStudyWav(channels: Float32Array[], sourceRate: number): ArrayBuffer {
  if (!channels.length || !channels[0]?.length || !Number.isFinite(sourceRate) || sourceRate <= 0) throw new Error("Bản ghi âm không hợp lệ.");
  const sourceLength = Math.min(...channels.map(channel => channel.length));
  if (sourceLength / sourceRate > 30.25) throw new Error("Bản ghi cần dài tối đa 30 giây.");
  const rate = 16000;
  const length = Math.min(30 * rate, Math.floor(sourceLength / sourceRate * rate));
  if (!length) throw new Error("Bản ghi âm quá ngắn.");
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => [...value].forEach((letter, index) => view.setUint8(offset + index, letter.charCodeAt(0)));
  text(0, "RIFF"); view.setUint32(4, 36 + length * 2, true); text(8, "WAVE"); text(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, "data"); view.setUint32(40, length * 2, true);
  for (let index = 0; index < length; index++) {
    const position = index * sourceRate / rate;
    const left = Math.min(sourceLength - 1, Math.floor(position));
    const right = Math.min(sourceLength - 1, left + 1);
    const fraction = position - left;
    const sample = channels.reduce((sum, channel) => sum + (channel[left]! * (1 - fraction) + channel[right]! * fraction), 0) / channels.length;
    const clipped = Math.max(-1, Math.min(1, Number.isFinite(sample) ? sample : 0));
    view.setInt16(44 + index * 2, Math.round(clipped * (clipped < 0 ? 32768 : 32767)), true);
  }
  return buffer;
}
