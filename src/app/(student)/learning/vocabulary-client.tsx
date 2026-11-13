"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { notify } from "@/lib/toast";
import type { VocabWord, CustomCard, VocabDifficulty } from "@/types/vocab";
import {
  createCustomCardAction,
  updateCustomCardAction,
  deleteCustomCardAction,
  toggleSaveWordAction,
} from "@/lib/api/vocabulary-actions";

type Tab = "bank" | "custom";
type DifficultyFilter = "all" | VocabDifficulty;

const DIFFICULTY_STYLES: Record<VocabDifficulty, { dot: string; badge: string }> = {
  easy: { dot: "bg-success", badge: "bg-success-soft text-success" },
  medium: { dot: "bg-warning", badge: "bg-warning-soft text-warning" },
  hard: { dot: "bg-danger", badge: "bg-danger-soft text-danger" },
};

function DifficultyDot({ level }: { level: VocabDifficulty }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${DIFFICULTY_STYLES[level].dot}`} />;
}

function DifficultyBadge({ level }: { level: VocabDifficulty }) {
  return (
    <span className={`rounded-pill px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${DIFFICULTY_STYLES[level].badge}`}>
      {{ easy: "HSK 1–3", medium: "HSK 4–6", hard: "HSK 7–9" }[level]}
    </span>
  );
}

export function VocabularyClient({
  allWords,
  savedWordIds,
  customCards,
}: {
  allWords: VocabWord[];
  savedWordIds: string[];
  customCards: CustomCard[];
}) {
  const [tab, setTab] = useState<Tab>("bank");
  const [, startTransition] = useTransition();

  // ---- Word bank state ----
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set(savedWordIds));

  const filteredWords = useMemo(() => {
    const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
    const term = normalize(query.trim());
    return allWords.filter((w) => {
      const matchesQuery = [w.word, w.example || "", w.definition].some((text) => normalize(text).includes(term));
      const matchesDifficulty = difficulty === "all" || w.difficulty === difficulty;
      return matchesQuery && matchesDifficulty;
    });
  }, [allWords, query, difficulty]);

  const activeWord = filteredWords[Math.min(activeIndex, filteredWords.length - 1)];

  function selectWord(index: number) {
    setActiveIndex(index);
    setFlipped(false);
  }

  function step(delta: number) {
    if (filteredWords.length === 0) return;
    setActiveIndex((i) => (i + delta + filteredWords.length) % filteredWords.length);
    setFlipped(false);
  }

  function toggleSave(word: VocabWord) {
    const isSaved = savedIds.has(word.wordid);
    startTransition(async () => {
      const result = await toggleSaveWordAction(word.wordid, isSaved);
      if (result.error) { notify.error(result.error); return; }
      setSavedIds((prev) => { const next = new Set(prev); if (isSaved) next.delete(word.wordid); else next.add(word.wordid); return next; });
    });
  }

  // ---- Custom cards state ----
  const [editingCard, setEditingCard] = useState<CustomCard | null>(null);
  const [previewCard, setPreviewCard] = useState<CustomCard | null>(null);
  const [customFlipped, setCustomFlipped] = useState(false);
  const [form, setForm] = useState({ front: "", back: "", example: "", difficulty: "medium" });

  function resetForm() {
    setEditingCard(null);
    setForm({ front: "", back: "", example: "", difficulty: "medium" });
  }

  function startEdit(card: CustomCard) {
    setEditingCard(card);
    setPreviewCard(card);
    setCustomFlipped(false);
    setForm({
      front: card.front,
      back: card.back,
      example: card.example ?? "",
      difficulty: card.difficulty ?? "medium",
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("front", form.front);
    fd.set("back", form.back);
    fd.set("example", form.example);
    fd.set("difficulty", form.difficulty);

    startTransition(async () => {
      const result = editingCard ? await updateCustomCardAction(editingCard.cardid, fd) : await createCustomCardAction(fd);
      if (result.error) notify.error(result.error); else resetForm();
    });
  }

  function handleDelete(cardid: string) {
    startTransition(async () => {
      const result = await deleteCustomCardAction(cardid); if(result.error) notify.error(result.error);
    });
    if (previewCard?.cardid === cardid) setPreviewCard(null);
    if (editingCard?.cardid === cardid) resetForm();
  }

  const livePreview: CustomCard = previewCard ?? {
    cardid: "preview",
    userid: "",
    front: form.front || "Chữ Hán",
    back: form.back || "Nghĩa từ",
    example: form.example || null,
    difficulty: (form.difficulty as VocabDifficulty) || null,
    created_at: "",
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Section tabs — matches the Lessons/Vocabulary pill pattern already on the page */}
      <div className="inline-flex w-fit gap-1 rounded-pill bg-mist p-1">
        {(["bank"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-pill px-4 py-2 text-sm font-semibold transition ${
              tab === t ? "bg-surface text-teal shadow-card" : "text-slate-soft hover:text-slate"
            }`}
          >
            {t === "bank" ? "Học và ôn từ vựng" : "Thẻ từ của tôi"}
          </button>
        ))}
      </div>

      {tab === "bank" ? (
        <div className="flex flex-col gap-6">
          {/* Saved words strip */}
          <section className="rounded-2xl border border-mist bg-surface p-6 shadow-hard">
            <h2 className="mb-3 font-display text-lg font-semibold text-ink"> Từ đã học trong phiên này </h2>
            {savedIds.size === 0 ? (
              <p className="text-sm text-slate-soft"> Đánh dấu từ đã học để ghi nhận hoạt động. Danh sách dưới đây thuộc phiên học hiện tại. </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allWords
                  .filter((w) => savedIds.has(w.wordid))
                  .map((w) => (
                    <span
                      key={w.wordid}
                      className="flex items-center gap-1.5 rounded-pill border border-mist bg-paper px-3 py-1.5 text-xs font-medium text-ink"
                    >
                      {w.word}
                      <button
                        onClick={() => toggleSave(w)}
                        className="text-slate-soft hover:text-danger"
                        aria-label={`Bỏ đánh dấu ${w.word}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </section>

          {/* Word bank study card */}
          <section className="rounded-2xl border border-mist bg-surface p-6 shadow-hard">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink"> Kho từ vựng tiếng Trung </h2>
                <p className="text-xs text-slate-soft">
                   Học {allWords.length}  từ vựng HSK với chữ Hán, pinyin và nghĩa từ </p>
              </div>
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                  setFlipped(false);
                }}
                placeholder="Tìm chữ Hán, pinyin hoặc nghĩa…"
                className="w-48 rounded-pill border border-mist px-3 py-1.5 text-sm outline-none focus:border-teal"
              />
            </div>

            <div className="mb-6 flex justify-center gap-2">
              {(["all", "easy", "medium", "hard"] as DifficultyFilter[]).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDifficulty(d);
                    setActiveIndex(0);
                    setFlipped(false);
                  }}
                  className={`rounded-pill px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                    difficulty === d
                      ? "bg-teal text-white"
                      : "border border-mist text-slate-soft hover:border-teal hover:text-teal"
                  }`}
                >
                  {{ all: "Tất cả", easy: "HSK 1–3", medium: "HSK 4–6", hard: "HSK 7–9" }[d]}
                </button>
              ))}
            </div>

            {!activeWord ? (
              <p className="py-12 text-center text-sm text-slate-soft"> Không tìm thấy từ phù hợp. </p>
            ) : (
              <>
                <div className="mx-auto flex max-w-xl items-center gap-4">
                  <button
                    onClick={() => step(-1)}
                    className="rounded-full border border-mist p-2 text-slate-soft hover:border-teal hover:text-teal"
                    aria-label="Từ trước"
                  >
                    ←
                  </button>

                  <div className="relative h-56 flex-1 [perspective:1200px]">
                    <motion.div
                      className="absolute inset-0 cursor-pointer rounded-2xl shadow-hard"
                      style={{ transformStyle: "preserve-3d" }}
                      animate={{ rotateY: flipped ? 180 : 0 }}
                      transition={{ duration: 0.45 }}
                      onClick={() => setFlipped((f) => !f)}
                    >
                      {/* Front */}
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border border-mist bg-cyan-light [backface-visibility:hidden]"
                      >
                        <DifficultyBadge level={activeWord.difficulty} />
                        <p lang="zh-CN" className="font-display text-3xl font-semibold text-ink">{activeWord.word}</p>
                        <p className="text-xs text-slate-soft"> Bấm để xem nghĩa </p>
                      </div>

                      {/* Back */}
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-mist bg-navy-deep px-8 text-center text-white [backface-visibility:hidden]"
                        style={{ transform: "rotateY(180deg)" }}
                      >
                        <p className="text-lg font-semibold">{activeWord.definition}</p>
                        {activeWord.example && (
                          <p className="text-sm text-white/80">Pinyin: {activeWord.example}</p>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSave(activeWord);
                          }}
                          className={`mt-1 rounded-pill px-4 py-1.5 text-xs font-semibold transition ${
                            savedIds.has(activeWord.wordid)
                              ? "bg-cyan text-navy-deep"
                              : "bg-white/15 text-white hover:bg-white/25"
                          }`}
                        >
                          {savedIds.has(activeWord.wordid) ? "Đã học ✓" : "Đánh dấu đã học"}
                        </button>
                      </div>
                    </motion.div>
                  </div>

                  <button
                    onClick={() => step(1)}
                    className="rounded-full border border-mist p-2 text-slate-soft hover:border-teal hover:text-teal"
                    aria-label="Từ tiếp theo"
                  >
                    →
                  </button>
                </div>

                {/* Word grid */}
                <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  {filteredWords.map((w, i) => (
                    <button
                      key={w.wordid}
                      onClick={() => selectWord(i)}
                      className={`flex items-center justify-between gap-2 rounded-pill border px-3 py-2 text-xs font-medium transition ${
                        w.wordid === activeWord.wordid
                          ? "border-teal bg-teal-deep text-white"
                          : "border-mist text-ink hover:border-teal"
                      }`}
                    >
                      {w.word}
                      <DifficultyDot level={w.difficulty} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            {/* Create / edit form */}
            <div className="rounded-2xl border border-mist bg-surface p-6 shadow-hard">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-ink">
                  {editingCard ? "Sửa thẻ từ" : "Tạo thẻ từ"}
                </h2>
                {editingCard && (
                  <button onClick={resetForm} className="text-xs font-medium text-slate-soft hover:text-danger">
                     Hủy </button>
                )}
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-soft">
                     Chữ Hán </label>
                  <input
                    required
                    value={form.front}
                    onChange={(e) => setForm((f) => ({ ...f, front: e.target.value }))}
                    placeholder="Ví dụ: 学习"
                    className="w-full rounded-md border border-mist px-3 py-2 text-sm outline-none focus:border-teal"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-soft">
                     Nghĩa từ </label>
                  <input
                    required
                    value={form.back}
                    onChange={(e) => setForm((f) => ({ ...f, back: e.target.value }))}
                    placeholder="Nhập nghĩa từ…"
                    className="w-full rounded-md border border-mist px-3 py-2 text-sm outline-none focus:border-teal"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-soft">
                     Câu ví dụ (không bắt buộc) </label>
                  <input
                    value={form.example}
                    onChange={(e) => setForm((f) => ({ ...f, example: e.target.value }))}
                    placeholder="Ví dụ: 我每天学习中文。"
                    className="w-full rounded-md border border-mist px-3 py-2 text-sm outline-none focus:border-teal"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-soft">
                     Độ khó (không bắt buộc) </label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
                    className="w-full rounded-md border border-mist px-3 py-2 text-sm outline-none focus:border-teal"
                  >
                    <option value="easy"> Cơ bản </option>
                    <option value="medium"> Trung cấp </option>
                    <option value="hard"> Nâng cao </option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="rounded-pill border border-mist bg-teal px-4 py-2 text-sm font-semibold text-white shadow-hard transition-all hover:shadow-brutalist"
                >
                  {editingCard ? "Lưu thay đổi" : "Lưu thẻ từ"}
                </button>
              </form>
            </div>

            {/* Live preview / flip card */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-mist bg-surface p-6 shadow-hard">
              <div className="relative h-64 w-full max-w-sm [perspective:1200px]">
                <motion.div
                  className="absolute inset-0 cursor-pointer rounded-2xl shadow-hard"
                  style={{ transformStyle: "preserve-3d" }}
                  animate={{ rotateY: customFlipped ? 180 : 0 }}
                  transition={{ duration: 0.45 }}
                  onClick={() => setCustomFlipped((f) => !f)}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border border-mist bg-cyan-light px-6 text-center [backface-visibility:hidden]">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-teal-deep">
                       Thẻ từ cá nhân </span>
                    <p className="font-display text-2xl font-semibold text-ink">{livePreview.front}</p>
                    <p className="text-xs text-slate-soft"> Bấm để lật thẻ </p>
                  </div>
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-mist bg-navy-deep px-6 text-center text-white [backface-visibility:hidden]"
                    style={{ transform: "rotateY(180deg)" }}
                  >
                    <p className="text-base font-semibold">{livePreview.back}</p>
                    {livePreview.example && <p className="text-sm italic text-white/80">&quot;{livePreview.example}&quot;</p>}
                    {previewCard && (
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(previewCard);
                          }}
                          className="rounded-pill bg-white/90 px-4 py-1.5 text-xs font-semibold text-ink hover:bg-surface"
                        >
                           Sửa </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(previewCard.cardid);
                          }}
                          className="rounded-pill bg-danger px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                        >
                           Xóa </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Personal words grid */}
          <section className="rounded-2xl border border-mist bg-surface p-6 shadow-hard">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink"> Từ vựng của tôi </h2>
            {customCards.length === 0 ? (
              <p className="text-sm text-slate-soft"> Chưa có thẻ từ cá nhân. </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {customCards.map((c) => (
                  <button
                    key={c.cardid}
                    onClick={() => {
                      setPreviewCard(c);
                      setCustomFlipped(false);
                    }}
                    className={`flex items-center justify-between gap-2 rounded-pill border px-3 py-2 text-xs font-medium transition ${
                      previewCard?.cardid === c.cardid
                        ? "border-teal bg-teal-deep text-white"
                        : "border-mist text-ink hover:border-teal"
                    }`}
                  >
                    {c.front}
                    {c.difficulty && <DifficultyDot level={c.difficulty} />}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
