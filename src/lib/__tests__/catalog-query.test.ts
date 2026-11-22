import { parseCatalogQuery, catalogHref, catalogSearch, practiceHref, practicePath } from "../catalog-query";
describe("catalog API filters", () => {
  it("preserves the admin topic key and Unicode search", () => {
    const query = parseCatalogQuery({ hskLevel: "3", topic: "HSK3-L01", search: "  我学习 & 中文  ", page: "2", skill: "reading" });
    const params = new URLSearchParams(catalogSearch(query));
    expect(params.get("topic")).toBe("HSK3-L01");
    expect(params.get("search")).toBe("我学习 & 中文");
    expect(params.get("skill")).toBe("READING");
    expect(params.get("page")).toBe("2");
  });
  it.each(["0", "-1", "1000001", "NaN", "2.5"])("rejects invalid page %s", page => expect(parseCatalogQuery({ page }).page).toBe(1));
  it.each(["0", "10", "1.5", "admin"])("ignores invalid HSK level %s", hskLevel => expect(parseCatalogQuery({ hskLevel }).hskLevel).toBe(""));
  it("does not allow arbitrary backend skill values", () => expect(parseCatalogQuery({ skill: "ADMIN" }).skill).toBe(""));
  it("keeps filters across pagination", () => {
    const url = new URL(catalogHref("/practice", { hskLevel: "1", topic: "HSK1-L01", page: 1 }, { page: 2 }), "http://localhost:3002");
    expect(url.searchParams.get("page")).toBe("2"); expect(url.searchParams.get("topic")).toBe("HSK1-L01");
  });
});

describe("consistent practice skill routes", () => {
  it.each(["LISTENING", "SPEAKING", "READING", "WRITING"])("uses a path segment for %s and preserves filters", skill => {
    const query = parseCatalogQuery({ skill, page: "3", hskLevel: "2", topic: "HSK2-L01", search: "学习 & 中文" });
    const url = new URL(practiceHref(query), "http://localhost:3002");
    expect(url.pathname).toBe(`/practice/${skill.toLowerCase()}`);
    expect(url.searchParams.has("skill")).toBe(false);
    expect(Object.fromEntries(url.searchParams)).toEqual({ page: "3", limit: "9", hskLevel: "2", topic: "HSK2-L01", search: "学习 & 中文" });
  });
  it("resets the page when switching skill without carrying the old skill parameter", () => {
    const url = new URL(practiceHref(parseCatalogQuery({ skill: "READING", page: "4", hskLevel: "3" }), { skill: "WRITING", page: 1 }), "http://localhost");
    expect(url.pathname).toBe("/practice/writing");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("hskLevel")).toBe("3");
    expect(url.searchParams.has("skill")).toBe(false);
  });
  it("keeps the all-skills view on the hub", () => {
    expect(practicePath("")).toBe("/practice");
    expect(practicePath("unknown")).toBe("/practice");
    expect(new URL(practiceHref({ page: 1 }), "http://localhost").pathname).toBe("/practice");
  });
});
