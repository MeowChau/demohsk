import Link from "next/link";
import { getTopics, getWords } from "@/lib/api/catalog";
import { parseCatalogQuery, type SearchParams } from "@/lib/catalog-query";
import { CatalogFilters, CatalogPagination, DataEmpty, PageHeading } from "@/components/ui/catalog";
import { HandwritingLesson } from "@/components/learning/handwriting-lesson";

export const metadata = { title: "Luyện viết từ vựng" };

export default async function WordWritingPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = { ...parseCatalogQuery(params), skill: "" };
  const [words, topics] = await Promise.all([getWords(query), getTopics()]);
  const wordId = typeof params.word === "string" ? params.word : undefined;
  return <div className="flex flex-col gap-6">
    <PageHeading title="Luyện viết từ vựng" description="Chọn từ theo cấp độ HSK và luyện viết từng nét trực tiếp trên ô chữ." />
    <Link className="w-fit text-sm font-medium text-brand hover:underline" href="/practice/writing">Xem danh sách bài luyện viết</Link>
    <CatalogFilters path="/practice/writing/words" query={query} topics={topics} />
    {words.data.length ? <HandwritingLesson key={JSON.stringify(query) + wordId} words={words.data} initialWordId={wordId} /> : <DataEmpty title="Chưa có từ phù hợp để luyện viết" />}
    <CatalogPagination path="/practice/writing/words" query={query} data={words} />
  </div>;
}
