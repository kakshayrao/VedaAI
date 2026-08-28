/** Normalize question/answer labels for matching: "Q11(b)" → "11b" */
export function normalizeLabel(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^(q(uestion)?|ans(wer)?|a)[\s.:\-_]*/i, "")
    .replace(/[\s._\-–—:/\\]+/g, "")
    .replace(/[()[\]{}]/g, "")
    .trim();
}

/** Parse "11(a)" / "11a" / "Q11-b" / "5(iii)" / "12(c)(i)" → { number, part? } */
export function parseLabel(raw: string): { number: string; part?: string } | null {
  const n = normalizeLabel(raw);
  const m = n.match(/^(\d+)([a-z]+)?$/);
  if (!m) return null;
  const part = m[2];
  // Letter (a), roman (iii), or nested 12(c)(i) → "ci". Longer = trailing words.
  if (part && part.length > 1 && !/^[ivx]{2,4}$/.test(part) && !/^[a-z][ivx]{1,4}$/.test(part)) {
    return null;
  }
  return { number: m[1], part };
}

export function questionKey(q: { number: string; part?: string }): string {
  return normalizeLabel(q.part ? `${q.number}${q.part}` : q.number);
}
