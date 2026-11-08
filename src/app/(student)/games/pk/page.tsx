import { permanentRedirect } from "next/navigation";
import { catalogHref, parseCatalogQuery, type SearchParams } from "@/lib/catalog-query";

export default async function LegacyPkPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = parseCatalogQuery(await searchParams);
  permanentRedirect(catalogHref("/games", {
    hskLevel: query.hskLevel,
    ...(query.page > 1 ? { page: query.page } : {}),
  }));
}
