import type { Question } from "../types";
import { questionKey } from "../normalize-label";
import type { RawPageQuestion } from "./extract-page";

function marksFromText(text: string): number | undefined {
  const m = text.match(/[\[(]\s*(\d+)\s*(?:marks?|m)?\s*[\])]/i) || text.match(/\((\d+)\)$/);
  return m ? Number(m[1]) : undefined;
}

/** Normalize, dedupe, assign global order. */
export function postprocessQuestions(raw: RawPageQuestion[]): Question[] {
  const seen = new Set<string>();
  const out: Question[] = [];

  const sorted = [...raw].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    const na = Number(a.number) || 0;
    const nb = Number(b.number) || 0;
    if (na !== nb) return na - nb;
    return (a.part || "").localeCompare(b.part || "");
  });

  for (const q of sorted) {
    const part = q.part?.replace(/[^a-z0-9]/gi, "").toLowerCase() || undefined;
    const number = String(q.number).replace(/\D/g, "") || String(q.number);
    const key = questionKey({ number, part });
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const text = q.text.trim();
    if (!text) continue;

    out.push({
      id: `q-${key}`,
      number,
      part,
      text,
      marks: q.marks ?? marksFromText(text),
      page: q.page,
      order: out.length + 1,
    });
  }

  // Soft sequence check — keep AI order; only re-number order field
  out.forEach((q, i) => {
    q.order = i + 1;
  });
  return out;
}

export function displayQuestionLabel(q: Question): string {
  return q.part ? `${q.number}(${q.part})` : q.number;
}
