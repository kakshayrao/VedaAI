"use client";

import type { AnalysisResult } from "@/lib/types";
import { displayQuestionLabel } from "@/lib/questions/postprocess";

const REVIEW_STATUSES = ["unmatched", "unlabelled", "ambiguous"] as const;

export function needsReviewStatus(status: string) {
  return (REVIEW_STATUSES as readonly string[]).includes(status);
}

export function UnmatchedPanel({
  result,
  activeAnswerId,
  onSelectAnswer,
}: {
  result: AnalysisResult;
  activeAnswerId?: string | null;
  onSelectAnswer: (answerId: string) => void;
}) {
  const needs = result.answers.filter((a) => needsReviewStatus(a.mapping.status));

  if (!needs.length) {
    return (
      <div className="border-b border-emerald-100 bg-emerald-50/70 px-4 py-2 text-xs text-emerald-800">
        All mapped — no review needed
      </div>
    );
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2">
      <div className="text-xs font-semibold text-amber-900">
        Needs review ({needs.length})
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {needs.map((a) => {
          const q = result.questions.find((x) => x.id === a.mapping.questionId);
          const tip =
            a.mapping.status === "ambiguous" && q
              ? `Q${displayQuestionLabel(q)}?`
              : a.mapping.status === "unlabelled"
                ? "Unlabelled"
                : a.detectedLabel
                  ? `Unmatched · ${a.detectedLabel}`
                  : "Unmatched";
          const active = activeAnswerId === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelectAnswer(a.id)}
              className={`rounded-full border px-2.5 py-0.5 text-xs transition ${
                active
                  ? "border-amber-500 bg-amber-100 font-medium text-amber-950"
                  : "border-amber-300/80 bg-white text-amber-900 hover:border-amber-400"
              }`}
            >
              {tip}
            </button>
          );
        })}
      </div>
    </div>
  );
}
