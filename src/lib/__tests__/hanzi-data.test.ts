import { hanziCharacters, hanziDataUrl, handwritingHref } from "../hanzi-data";

it("keeps repeated Chinese characters and skips pinyin, numbers and punctuation", () => {
  expect(hanziCharacters("妈妈 māma，学习中文！123")).toEqual(["妈", "妈", "学", "习", "中", "文"]);
  expect(hanziCharacters("𠮷")).toEqual(["𠮷"]);
});

it.each(["", "ab", "你好", "../file", "a", "/"])("rejects non-character data requests %s", value => {
  expect(() => hanziDataUrl(value)).toThrow();
});

it("builds a version-pinned Hanzi Writer CDN URL", () => {
  expect(hanziDataUrl("你")).toBe("https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/%E4%BD%A0.json");
});

it("links the actual vocabulary word and HSK level to handwriting practice", () => {
  const url = new URL(handwritingHref({ id: 42, hanzi: "学习", hskLevel: 2 }), "http://localhost");
  expect(url.pathname).toBe("/practice/writing/words");
  expect(Object.fromEntries(url.searchParams)).toEqual({ word: "42", search: "学习", hskLevel: "2" });
});

describe("stroke data loading", () => {
  const originalFetch = global.fetch;
  beforeEach(() => jest.resetModules());
  afterEach(() => { global.fetch = originalFetch; });

  it("loads and caches a character from the pinned CDN", async () => {
    const { loadHanziData } = await import("../hanzi-data");
    const data = { strokes: ["M 0 0 L 1 1"], medians: [[[0, 0], [1, 1]]] };
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => data });
    expect(await Promise.all([loadHanziData("上"), loadHanziData("上")])).toEqual([data, data]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(jest.mocked(global.fetch).mock.calls[0]?.[0]).toBe("https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/%E4%B8%8A.json");
  });

  it("uses the secondary CDN when the primary one fails", async () => {
    const { loadHanziData } = await import("../hanzi-data");
    const data = { strokes: ["M 0 0 L 1 1"], medians: [[[0, 0], [1, 1]]] };
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error("primary unavailable"))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => data });
    expect(await loadHanziData("你")).toEqual(data);
    expect(jest.mocked(global.fetch).mock.calls.map(([url]) => url)).toEqual([
      "https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/%E4%BD%A0.json",
      "https://unpkg.com/hanzi-writer-data@2.0.1/%E4%BD%A0.json",
    ]);
  });
});