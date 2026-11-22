import { notFound, permanentRedirect } from "next/navigation";
import { canonicalAttemptHref } from "@/lib/attempt-routes";
import type { SearchParams } from "@/lib/catalog-query";

export default async function LegacyAttemptPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { attemptId } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach(item => query.append(key, item));
    else if (value !== undefined) query.set(key, value);
  }
  const destination = canonicalAttemptHref("/practice/attempt/" + attemptId, query);
  if (!destination) notFound();
  permanentRedirect(destination);
}
