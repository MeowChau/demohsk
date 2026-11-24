"use client";

import { useNavigationRouter as useRouter } from "@/components/shell/navigation-protection";
import type { FormEvent } from "react";
import { CatalogFilters } from "@/components/ui/catalog";
import { parseCatalogQuery, practiceHref, practicePath, type CatalogQuery } from "@/lib/catalog-query";
import type { HskTopic } from "@/lib/api/types";

export function PracticeFilters({ query, topics }: { query: CatalogQuery; topics: HskTopic[] }) {
  const router = useRouter();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const next = parseCatalogQuery({
      page: "1",
      search: String(fields.get("search") || ""),
      hskLevel: String(fields.get("hskLevel") || ""),
      topic: String(fields.get("topic") || ""),
      skill: String(fields.get("skill") || ""),
    });
    router.push(practiceHref(next));
  }
  // Native GET fallback goes through the hub, which redirects old ?skill= URLs.
  return <CatalogFilters path="/practice" resetHref={practicePath(query.skill)} query={query} topics={topics} skills onSubmit={submit} />;
}
