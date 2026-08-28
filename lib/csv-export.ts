import { displayQuestionLabel } from "./questions/postprocess";
import type { AnalysisResult, Question } from "./types";

/** Escape one CSV cell (RFC-ish). */
export function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return lines.join("\r\n") + "\r\n";
}

export type ExamRosterRow = {
  rollNo?: string;
  name: string;
  status: string;
  totalScore?: number | null;
  maxScore?: number | null;
  unanswered?: number | null;
  perQuestion?: Record<string, number | null | undefined>;
};

/** Exam-level roster CSV: roll, name, status, totals, unanswered, per-Q scores. */
export function examRosterCsv(questions: Question[], rows: ExamRosterRow[]): string {
  const qLabels = questions.map((q) => displayQuestionLabel(q));
  const headers = [
    "roll",
    "name",
    "status",
    "total_score",
    "max_score",
    "unanswered",
    ...qLabels.map((l) => `score_${l}`),
  ];
  const body = rows.map((r) => [
    r.rollNo ?? "",
    r.name,
    r.status,
    r.totalScore ?? "",
    r.maxScore ?? "",
    r.unanswered ?? "",
    ...qLabels.map((l) => r.perQuestion?.[l] ?? ""),
  ]);
  return rowsToCsv(headers, body);
}

/** Question-level rows for one student/job. */
export function jobQuestionCsv(result: AnalysisResult): string {
  const headers = [
    "question",
    "marks",
    "mapping_status",
    "score",
    "max_score",
    "verdict",
    "answered",
  ];
  const rows = result.questions.map((q) => {
    const ans = result.answers.find((a) => a.mapping.questionId === q.id);
    const g = result.grading?.[q.id];
    return [
      displayQuestionLabel(q),
      q.marks ?? "",
      ans?.mapping.status ?? "unanswered",
      g?.score ?? "",
      g?.maxScore ?? q.marks ?? "",
      g?.verdict ?? "",
      ans ? "yes" : "no",
    ];
  });
  return rowsToCsv(headers, rows);
}

/** Totals from a graded AnalysisResult. */
export function scoreTotals(result: AnalysisResult): {
  total: number;
  max: number;
  unanswered: number;
  perQuestion: Record<string, number | null>;
} {
  let total = 0;
  let max = 0;
  const perQuestion: Record<string, number | null> = {};
  for (const q of result.questions) {
    const label = displayQuestionLabel(q);
    const g = result.grading?.[q.id];
    const m = g?.maxScore ?? q.marks ?? 0;
    max += m;
    if (g?.score != null) {
      total += g.score;
      perQuestion[label] = g.score;
    } else {
      perQuestion[label] = null;
    }
  }
  return {
    total,
    max,
    unanswered: result.summary.unanswered,
    perQuestion,
  };
}
