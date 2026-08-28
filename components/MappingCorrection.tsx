"use client";

import { useEffect } from "react";
import type { AnalysisResult, Question } from "@/lib/types";
import { displayQuestionLabel } from "@/lib/questions/postprocess";

export function MappingCorrection({
  result,
  answerId,
  onClose,
  onRemap,
  onStartDraw,
}: {
  result: AnalysisResult;
  answerId: string;
  onClose: () => void;
  onRemap: (questionId: string | null) => void;
  onStartDraw: () => void;
}) {
  const ans = result.answers.find((a) => a.id === answerId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!ans) return null;

  const statusHint =
    ans.mapping.status === "ambiguous"
      ? "Ambiguous match — pick the right question"
      : ans.mapping.status === "unlabelled"
        ? "No question label detected"
        : "Could not match this answer";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Remap answer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Remap answer</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        <p className="mt-1 text-xs text-amber-700">{statusHint}</p>
        <p className="mt-2 line-clamp-3 text-sm text-gray-600">{ans.text}</p>
        <label className="mt-4 block text-xs font-medium text-gray-500">
          Map to question
        </label>
        <select
          className="mt-1 w-full rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-2.5 text-sm"
          value={ans.mapping.questionId || ""}
          onChange={(e) => onRemap(e.target.value || null)}
          autoFocus
        >
          <option value="">— Unmatched —</option>
          {result.questions.map((q: Question) => (
            <option key={q.id} value={q.id}>
              Q{displayQuestionLabel(q)} — {q.text.slice(0, 60)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-full bg-gray-950 px-3 py-2.5 text-sm font-semibold text-white"
        >
          Done
        </button>
        <button
          type="button"
          onClick={onStartDraw}
          className="mt-2 w-full text-xs font-medium text-gray-500 hover:text-gray-700"
        >
          Draw region on sheet
        </button>
      </div>
    </div>
  );
}
