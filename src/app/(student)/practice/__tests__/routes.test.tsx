jest.mock("@/lib/api/server", () => ({ getApiUser: jest.fn(async () => ({ currentHskLevel: 1 })) }));
jest.mock("@/lib/api/catalog", () => ({ getPracticeSets: jest.fn(), getTopics: jest.fn() }));
jest.mock("@/components/ui/refresh-button", () => ({ RefreshButton: () => null }));
jest.mock("next/navigation", () => ({ ...jest.requireActual("next/navigation"), useRouter: () => ({ push: jest.fn() }), redirect: jest.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }), notFound: jest.fn(() => { throw new Error("NOT_FOUND"); }) }));

import { renderToStaticMarkup } from "react-dom/server";
import { redirect } from "next/navigation";
import { getPracticeSets, getTopics } from "@/lib/api/catalog";
import { parseCatalogQuery } from "@/lib/catalog-query";
import { PracticeCatalog } from "@/components/learning/practice-catalog";
import PracticeHubPage from "../page";
import PracticeSkillPage from "../[skill]/page";

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getTopics).mockResolvedValue([]);
  jest.mocked(getPracticeSets).mockResolvedValue({ data: [], page: 2, limit: 9, total: 72, totalPages: 3 });
});

it.each(["LISTENING", "SPEAKING", "READING", "WRITING"])("redirects old ?skill=%s URLs while preserving filters", async skill => {
  await expect(PracticeHubPage({ searchParams: Promise.resolve({ skill, page: "2", hskLevel: "3", search: "中文", topic: "HSK3-L01" }) })).rejects.toThrow("REDIRECT:");
  const url = new URL(jest.mocked(redirect).mock.calls[0]![0], "http://localhost");
  expect(url.pathname).toBe(`/practice/${skill.toLowerCase()}`);
  expect(Object.fromEntries(url.searchParams)).toEqual({ page: "2", limit: "9", hskLevel: "3", topic: "HSK3-L01", search: "中文" });
  expect(getPracticeSets).not.toHaveBeenCalled();
});

it.each(["listening", "speaking", "reading"])("derives the %s filter from its route", async skill => {
  const page = await PracticeSkillPage({ params: Promise.resolve({ skill }), searchParams: Promise.resolve({ page: "2", hskLevel: "3" }) });
  expect(page.props.query).toMatchObject({ skill: skill.toUpperCase(), page: 2, hskLevel: "3" });
});

it("keeps all-skills browsing at /practice and rejects unknown skill paths", async () => {
  const page = await PracticeHubPage({ searchParams: Promise.resolve({}) });
  expect(page.props.query.skill).toBe("");
  await expect(PracticeSkillPage({ params: Promise.resolve({ skill: "other" }), searchParams: Promise.resolve({}) })).rejects.toThrow("NOT_FOUND");
});

it("uses canonical skill links and keeps pagination/reset on the current skill", async () => {
  const query = parseCatalogQuery({ skill: "READING", page: "2", hskLevel: "3", topic: "HSK3-L01" });
  const html = renderToStaticMarkup(await PracticeCatalog({ query }));
  const links = Array.from(html.matchAll(/href="([^"]+)"/g), match => new URL(match[1]!.replaceAll("&amp;", "&"), "http://localhost"));
  for (const skill of ["listening", "speaking", "reading", "writing"]) {
    const link = links.find(url => url.pathname === `/practice/${skill}` && url.searchParams.get("page") === "1");
    expect(link).toBeDefined();
    expect(link!.searchParams.has("skill")).toBe(false);
  }
  const next = links.find(url => url.searchParams.get("page") === "3")!;
  expect(next.pathname).toBe("/practice/reading");
  expect(next.searchParams.get("hskLevel")).toBe("3");
  expect(next.searchParams.has("skill")).toBe(false);
  expect(html).toContain('href="/practice/reading"');
});
