/** Env-overridable page batch sizes (free tier = requests/day). */
export function questionPageBatch(): number {
  return readBatch(process.env.QUESTION_PAGE_BATCH, 3);
}

export function answerPageBatch(): number {
  return readBatch(process.env.ANSWER_PAGE_BATCH, 2);
}

function readBatch(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

/** Pages after the last completed one — resume never re-sends finished pages. */
export function pendingPages<T extends { page: number }>(pages: T[], lastDone: number): T[] {
  return pages.filter((p) => p.page > lastDone);
}

/** Slice items into batches of `size` (pure). */
export function chunkBatch<T>(items: T[], size: number): T[][] {
  const n = Math.max(1, Math.floor(size));
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += n) out.push(items.slice(i, i + n));
  return out;
}

/** Mid-run message fragment: "pages 4–6 of 12" or "page 4 of 12". */
export function formatPageRange(from: number, to: number, total: number): string {
  if (from === to) return `page ${from} of ${total}`;
  return `pages ${from}–${to} of ${total}`;
}
