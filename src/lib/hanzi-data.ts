import type { CharacterJson } from "hanzi-writer";
import type { HskWord } from "@/lib/api/types";

export function handwritingHref(word: Pick<HskWord, "id" | "hanzi" | "hskLevel">): string {
  return "/practice/writing/words?" + new URLSearchParams({ word: String(word.id), search: word.hanzi, hskLevel: String(word.hskLevel) });
}

export function handwritingLessonHref(topic: string, hskLevel: number): string {
  return "/practice/writing/words?" + new URLSearchParams({ topic, hskLevel: String(hskLevel) });
}

export function hanziCharacters(text: string): string[] {
  return Array.from(text).filter(character => /^\p{Script=Han}$/u.test(character));
}

const DATA_BASE_URLS = [
  "https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/",
  "https://unpkg.com/hanzi-writer-data@2.0.1/",
] as const;
const REQUEST_CACHE_LIMIT = 64;
const characterRequests = new Map<string, Promise<CharacterJson>>();

function assertHanziCharacter(character: string): void {
  if (Array.from(character).length !== 1 || !/^\p{Script=Han}$/u.test(character)) {
    throw new Error("Chọn một chữ Hán để luyện viết.");
  }
}

export function hanziDataUrl(character: string): string {
  assertHanziCharacter(character);
  return DATA_BASE_URLS[0] + encodeURIComponent(character) + ".json";
}

function isCharacterData(value: unknown): value is CharacterJson {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<CharacterJson>;
  return Array.isArray(data.strokes)
    && data.strokes.length > 0
    && data.strokes.every(stroke => typeof stroke === "string" && stroke.length > 0)
    && Array.isArray(data.medians)
    && data.medians.length === data.strokes.length
    && data.medians.every(stroke => Array.isArray(stroke)
      && stroke.length > 0
      && stroke.every(point => Array.isArray(point)
        && point.length === 2
        && point.every(coordinate => Number.isFinite(coordinate))));
}

async function fetchCharacterData(character: string): Promise<CharacterJson> {
  let notFoundCount = 0;

  for (const baseUrl of DATA_BASE_URLS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const url = baseUrl + encodeURIComponent(character) + ".json";
      const response = await fetch(url, { signal: controller.signal });
      if (response.status === 404) {
        notFoundCount += 1;
        continue;
      }
      if (!response.ok) continue;

      const data: unknown = await response.json();
      if (isCharacterData(data)) return data;
    } catch {
      // Try the secondary public mirror if the primary CDN is unavailable.
    } finally {
      clearTimeout(timeout);
    }
  }

  if (notFoundCount === DATA_BASE_URLS.length) {
    throw new Error("Chữ này chưa có dữ liệu nét để luyện viết. Hãy chọn chữ khác.");
  }
  throw new Error("Chưa tải được dữ liệu nét chữ. Kiểm tra kết nối mạng rồi thử lại.");
}

export function loadHanziData(character: string): Promise<CharacterJson> {
  assertHanziCharacter(character);

  const cached = characterRequests.get(character);
  if (cached) return cached;

  const request = fetchCharacterData(character);
  characterRequests.set(character, request);
  if (characterRequests.size > REQUEST_CACHE_LIMIT) {
    const oldestCharacter = characterRequests.keys().next().value;
    if (oldestCharacter) characterRequests.delete(oldestCharacter);
  }
  void request.catch(() => {
    if (characterRequests.get(character) === request) characterRequests.delete(character);
  });
  return request;
}
