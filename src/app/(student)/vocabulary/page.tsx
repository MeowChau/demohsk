import { getTopics, getWords } from "@/lib/api/catalog";
import { parseCatalogQuery, type SearchParams } from "@/lib/catalog-query";
import { CatalogFilters, CatalogPagination, DataEmpty, PageHeading } from "@/components/ui/catalog";
import { WordCards } from "@/components/learning/word-cards";
import { StudyTracker } from "@/components/shell/study-tracker";
import { STUDY_MODULES } from "@/lib/hsk";

export const metadata = { title: "Từ vựng tiếng Trung" };

export default async function VocabularyPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = parseCatalogQuery(await searchParams);
  const [words, topics] = await Promise.all([getWords(query), getTopics()]);
  return (
    <div className="flex flex-col gap-6">
      <StudyTracker module={STUDY_MODULES.vocabulary} />
      <PageHeading title="Từ vựng tiếng Trung" description="Học chữ Hán, pinyin và nghĩa từ. Đánh dấu mức độ ghi nhớ để cập nhật tiến độ học của bạn." />
      <CatalogFilters path="/vocabulary" query={query} topics={topics} />
      {words.data.length ? <WordCards key={JSON.stringify(query)} words={words.data} /> : <DataEmpty />}
      <CatalogPagination path="/vocabulary" query={query} data={words} />
    </div>
  );
}
