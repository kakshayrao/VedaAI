"use client";

import type { AnalysisResult, Question } from "@/lib/types";
import { displayQuestionLabel } from "@/lib/questions/postprocess";
import { needsReviewStatus } from "@/lib/map-answers";

function scorePill(result: AnalysisResult, q: Question) {
  const g = result.grading?.[q.id];
  if (!g || g.score == null || g.maxScore == null) return null;
  const ratio = g.maxScore ? g.score / g.maxScore : 0;
  const color =
    g.verdict === "correct" || ratio >= 0.99
      ? "bg-emerald-100 text-emerald-700"
      : g.verdict === "incorrect" || ratio < 0.4
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-800";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {g.score}/{g.maxScore}
    </span>
  );
}

export function QuestionList({
  result,
  selectedId,
  expanded,
  onSelect,
  onToggle,
  onExpandAll,
}: {
  result: AnalysisResult;
  selectedId: string | null;
  expanded: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onExpandAll: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">
          Extracted Questions{" "}
          <span className="font-normal text-gray-400">(from question paper)</span>
        </h2>
        <button
          type="button"
          onClick={onExpandAll}
          className="text-xs font-medium text-orange-600 hover:underline"
        >
          Expand All
        </button>
      </div>
      <ul className="flex-1 space-y-2 overflow-y-auto p-3">
        {result.questions.map((q) => {
          const label = displayQuestionLabel(q);
          const selected = selectedId === q.id;
          const open = expanded.has(q.id) || selected;
          const feedback = result.grading?.[q.id]?.feedback;
          const mapped = result.answers.find((a) => a.mapping.questionId === q.id);
          const review = mapped && needsReviewStatus(mapped.mapping.status);
          return (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(q.id);
                  onToggle(q.id);
                }}
                className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                  selected
                    ? review
                      ? "border-amber-400 bg-amber-50"
                      : "border-orange-400 bg-orange-50"
                    : "border-transparent bg-white hover:bg-gray-50"
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                  {label}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm text-gray-800">{q.text}</span>
                  {open && feedback && (
                    <span className="mt-2 block rounded-xl bg-white/80 p-2 text-xs text-gray-600">
                      <span className="font-semibold text-orange-600">AI Feedback</span>
                      <br />
                      {feedback}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {review && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      Review
                    </span>
                  )}
                  {scorePill(result, q)}
                  <span className="text-gray-400">{open ? "▾" : "▸"}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
