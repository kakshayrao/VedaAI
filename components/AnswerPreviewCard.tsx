"use client";

import type { StudentAnswer } from "@/lib/types";

export function AnswerPreviewCard({
  answer,
  questionLabel,
  onReview,
}: {
  answer: StudentAnswer | null;
  questionLabel: string;
  onReview?: () => void;
}) {
  if (!answer) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white/95 p-4 text-sm text-gray-600 shadow-sm">
        <div className="font-semibold text-gray-900">Q{questionLabel}</div>
        <p className="mt-2">No answer detected for this question.</p>
      </div>
    );
  }

  const page = answer.regions.find((r) => r.kind === "body")?.page ?? answer.regions[0]?.page;
  const conf = answer.mapping.confidence;
  const status = answer.mapping.status;
  const confLabel =
    status === "matched" && conf >= 0.95
      ? "✓ High confidence"
      : status === "matched"
        ? "✓ Matched"
        : status === "ambiguous"
          ? "⚠ Review mapping"
          : status === "unlabelled"
            ? "? Unidentified answer"
            : "? Unmatched";

  const review = status === "ambiguous" || status === "unmatched" || status === "unlabelled";

  return (
    <div
      className={`rounded-2xl border bg-white/95 p-4 shadow-sm ${
        review ? "border-amber-200" : "border-gray-200"
      }`}
    >
      <div className="text-sm font-semibold text-gray-900">Q{questionLabel}</div>
      <div className="mt-0.5 text-xs text-gray-500">
        Answer detected{page ? ` · Page ${page}` : ""}
      </div>
      <p className="mt-2 line-clamp-3 text-sm text-gray-700">
        &ldquo;{answer.text.slice(0, 180)}
        {answer.text.length > 180 ? "…" : ""}&rdquo;
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className={`text-xs font-medium ${
            status === "matched" ? "text-emerald-600" : "text-amber-700"
          }`}
        >
          {confLabel}
        </span>
        {onReview && review && (
          <button
            type="button"
            onClick={onReview}
            className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900"
          >
            Remap
          </button>
        )}
      </div>
    </div>
  );
}
