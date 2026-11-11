export type SearchParams = Record<string, string | string[] | undefined>;
export type CatalogQuery = { page: number; limit: number; hskLevel: string; topic: string; search: string; skill: string; view?: "cards" | "list" };
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || "";
export function parseCatalogQuery(params: SearchParams, defaultLevel?: number | null): CatalogQuery {
  const rawLevel = first(params.hskLevel) || (defaultLevel ? String(defaultLevel) : "");
  const page = Number(first(params.page));
  const skill = first(params.skill).toUpperCase();
  return {
    page: Number.isInteger(page) && page >= 1 && page <= 1000000 ? page : 1,
    limit: 24,
    hskLevel: /^[1-9]$/.test(rawLevel) ? rawLevel : "",
    topic: first(params.topic).trim().slice(0, 255),
    search: first(params.search).trim().slice(0, 500),
    skill: ["LISTENING", "SPEAKING", "READING", "WRITING"].includes(skill) ? skill : "",
  };
}
export function catalogSearch(query: Partial<CatalogQuery>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== "" && value !== undefined && value !== null) params.set(key, String(value));
  return params.toString();
}
export function catalogHref(path: string, query: Partial<CatalogQuery>, changes: Partial<CatalogQuery> = {}) {
  const search = catalogSearch({ ...query, ...changes });
  return path + (search ? "?" + search : "");
}

export function practicePath(skill?: string): string {
  const value = skill?.toUpperCase();
  return value && ["LISTENING", "SPEAKING", "READING", "WRITING"].includes(value)
    ? `/practice/${value.toLowerCase()}` : "/practice";
}

export function practiceHref(query: Partial<CatalogQuery>, changes: Partial<CatalogQuery> = {}): string {
  const next = { ...query, ...changes };
  return catalogHref(practicePath(next.skill), { ...next, skill: "" });
}
