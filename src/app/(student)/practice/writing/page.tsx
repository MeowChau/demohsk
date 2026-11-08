import { PracticeCatalog } from "@/components/learning/practice-catalog";
import { redirect } from "next/navigation";
import { parseCatalogQuery, practiceHref, type SearchParams } from "@/lib/catalog-query";

export const metadata = { title: "Bài luyện viết" };

export default async function WritingPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = parseCatalogQuery({ ...params, skill: "WRITING" });
  if (params.skill !== undefined) redirect(practiceHref(query));
  return <PracticeCatalog query={query} />;
}
