import { PracticeCatalog } from "@/components/learning/practice-catalog";
import { redirect } from "next/navigation";
import { parseCatalogQuery, practiceHref, type SearchParams } from "@/lib/catalog-query";
export const metadata = { title: "Luyện tập tiếng Trung" };
export default async function PracticeHubPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = parseCatalogQuery(await searchParams);
  if (query.skill) redirect(practiceHref(query));
  return <PracticeCatalog query={query} />;
}
