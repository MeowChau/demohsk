export type AttemptKind = "set" | "exam";

export function resourceId(value: string | number): string | null {
  const text = String(value);
  if (!/^\d+$/.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) && id > 0 ? String(id) : null;
}

function requireId(value: string | number): string {
  const id = resourceId(value);
  if (!id) throw new Error("Mã bài HSK không hợp lệ.");
  return id;
}

export function examDetailHref(id: string | number): string {
  return "/exams/" + requireId(id);
}

export function examAttemptHref(id: string | number): string {
  return examDetailHref(id) + "/attempt";
}

export function practiceSetAttemptHref(id: string | number): string {
  return "/practice/sets/" + requireId(id) + "/attempt";
}

export function parseAttemptReference(value: string) {
  const match = /^(set|exam)-(\d+)$/.exec(value);
  if (!match) return null;
  const id = resourceId(match[2]!);
  if (!id) return null;
  const kind = match[1] as AttemptKind;
  return { kind, id, reference: kind + "-" + id };
}

export function attemptHref(reference: string): string {
  const parsed = parseAttemptReference(reference);
  if (!parsed) throw new Error("Mã bài luyện không hợp lệ.");
  return parsed.kind === "exam" ? examAttemptHref(parsed.id) : practiceSetAttemptHref(parsed.id);
}

/** Return a redirect only for legacy or noncanonical attempt URLs. */
export function canonicalAttemptHref(pathname: string, searchParams: URLSearchParams): string | null {
  let destination: string;
  const legacy = /^\/practice\/attempt\/([^/]+)\/?$/.exec(pathname);
  if (legacy) {
    // The resource in the path wins if an old query points to a different test.
    const parsed = parseAttemptReference(legacy[1]!) || parseAttemptReference(searchParams.get("testid") || "");
    if (!parsed) return null;
    destination = attemptHref(parsed.reference);
  } else {
    const exam = /^\/exams\/(\d+)\/attempt\/?$/.exec(pathname);
    const set = /^\/practice\/sets\/(\d+)\/attempt\/?$/.exec(pathname);
    const id = resourceId(exam?.[1] || set?.[1] || "");
    if (!id) return null;
    destination = exam ? examAttemptHref(id) : practiceSetAttemptHref(id);
  }
  const query = new URLSearchParams(searchParams);
  query.delete("testid");
  const search = query.toString();
  const target = destination + (search ? "?" + search : "");
  const currentSearch = searchParams.toString();
  return target === pathname + (currentSearch ? "?" + currentSearch : "") ? null : target;
}
