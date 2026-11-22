import { notFound, redirect } from "next/navigation";
import { PracticeCatalog } from "@/components/learning/practice-catalog";
import { parseCatalogQuery, practiceHref, type SearchParams } from "@/lib/catalog-query";
export default async function PracticeSkillPage({params,searchParams}:{params:Promise<{skill:string}>;searchParams:Promise<SearchParams>}) {
  const {skill} = await params;
  if(!["listening","speaking","reading","writing"].includes(skill)) notFound();
  const filters = await searchParams;
  const query = parseCatalogQuery({ ...filters, skill: skill.toUpperCase() });
  if (filters.skill !== undefined) redirect(practiceHref(query));
  return <PracticeCatalog query={query} />;
}
