"use client";

import type { Question, StudentAnswer } from "@/lib/types";
import { displayQuestionLabel } from "@/lib/questions/postprocess";

export function ExtractingState({
  message,
  error,
  resumable,
  progress,
  lastQuestionPage,
  questionPageCount,
  lastAnswerPage,
  answerPageCount,
  questions,
  answers,
  onResume,
  resumeBusy,
  onBackToUpload,
  backLabel = "Back to upload",
}: {
  message?: string;
  error?: string | null;
  resumable?: boolean;
  progress?: number;
  lastQuestionPage?: number;
  questionPageCount?: number;
  lastAnswerPage?: number;
  answerPageCount?: number;
  questions?: Question[];
  answers?: StudentAnswer[];
  onResume?: () => void;
  resumeBusy?: boolean;
  onBackToUpload?: () => void;
  backLabel?: string;
}) {
  const qDone = lastQuestionPage ?? 0;
  const qTotal = questionPageCount ?? 0;
  const aDone = lastAnswerPage ?? 0;
  const aTotal = answerPageCount ?? 0;
  const pct = typeof progress === "number" ? Math.max(0, Math.min(100, progress)) : null;
  const qs = questions ?? [];
  const ans = answers ?? [];

  const matchedIds = new Set(
    ans
      .filter((a) => a.mapping.status === "matched" && a.mapping.questionId)
      .map((a) => a.mapping.questionId!)
  );
  const ambiguousIds = new Set(
    ans
      .filter((a) => a.mapping.status === "ambiguous" && a.mapping.questionId)
      .map((a) => a.mapping.questionId!)
  );
  // Hide while still mid question-paper pages; show as soon as Q stage is done (or no page info).
  const showQuestions = qs.length > 0 && !(qTotal > 0 && qDone < qTotal);

  let progressLine: string | null = null;
  if (qTotal > 0 && qDone < qTotal) {
    progressLine = `Extracted through question page ${qDone} of ${qTotal}`;
  } else if (qTotal > 0 && aTotal > 0 && aDone < aTotal) {
    progressLine = `Questions done. Answer sheets through page ${aDone} of ${aTotal}`;
  } else if (qTotal > 0 && qDone >= qTotal && aTotal > 0 && aDone >= aTotal) {
    progressLine = `Extracted all ${qTotal} question and ${aTotal} answer pages`;
  } else if (qDone > 0 || aDone > 0) {
    progressLine = `Extracted through page ${Math.max(qDone, aDone)}`;
  }

  const failed = Boolean(error);
  const title = failed && resumable ? "Paused" : failed ? "Failed" : "Extracting...";
  const mapLine =
    showQuestions && (aDone > 0 || ans.length > 0)
      ? `${matchedIds.size} answered · ${Math.max(0, qs.length - matchedIds.size - ambiguousIds.size)} not yet · ${ambiguousIds.size} ambiguous`
      : null;

  return (
    <div className="flex min-h-[70vh] items-start justify-center px-4 py-10">
      <div
        className={`w-full rounded-3xl bg-white px-8 py-10 shadow-sm ${
          showQuestions ? "max-w-2xl" : "max-w-xl py-16 text-center"
        }`}
      >
        <div className={`mb-6 flex items-center gap-2 text-orange-500 ${showQuestions ? "" : "justify-center"}`}>
          <Sparkle className="h-6 w-6 opacity-70" />
          <Sparkle className="h-10 w-10" />
          <Sparkle className="h-5 w-5 opacity-80" />
        </div>
        <h2 className={`text-2xl font-bold text-gray-900 ${showQuestions ? "" : "text-center"}`}>
          {title}
        </h2>
        <p className={`mt-2 text-sm text-gray-500 ${showQuestions ? "" : "text-center"}`}>
          {message || "This may take a while"}
        </p>
        {pct !== null && (
          <div className="mx-auto mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-orange-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        {progressLine && (
          <p className="mt-3 text-sm font-medium text-gray-700">{progressLine}</p>
        )}
        {mapLine && <p className="mt-1 text-xs text-gray-500">{mapLine}</p>}
        {error && (
          <p className="mt-3 text-sm text-red-600 break-words">{error}</p>
        )}
        {failed && !resumable && (
          <p className="mt-2 text-sm text-gray-600">
            No checkpoint saved. Re-upload the files to start again.
          </p>
        )}
        {failed && resumable && (
          <p className="mt-2 text-sm text-gray-600">
            Partial progress kept (including after 503/429 quota pauses). Resume to continue.
          </p>
        )}
        {resumable && onResume && (
          <button
            type="button"
            onClick={onResume}
            disabled={resumeBusy}
            className="mt-6 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {resumeBusy ? "Resuming…" : "Resume"}
          </button>
        )}
        {failed && onBackToUpload && (
          <button
            type="button"
            onClick={onBackToUpload}
            className="mt-4 block text-sm font-medium text-orange-600 hover:underline"
          >
            {backLabel}
          </button>
        )}

        {showQuestions && (
          <div className="mt-8 border-t border-gray-100 pt-6 text-left">
            <h3 className="text-sm font-semibold text-gray-900">
              Extracted questions{" "}
              <span className="font-normal text-gray-400">({qs.length})</span>
            </h3>
            <ul className="mt-3 max-h-[min(50vh,28rem)] space-y-2 overflow-y-auto pr-1">
              {qs.map((q) => {
                const label = displayQuestionLabel(q);
                const mapped = matchedIds.has(q.id);
                const amb = ambiguousIds.has(q.id);
                const showMap = aDone > 0 || ans.length > 0;
                return (
                  <li
                    key={q.id}
                    className={`rounded-2xl border px-3 py-3 ${
                      mapped
                        ? "border-emerald-200 bg-emerald-50/60"
                        : amb
                          ? "border-amber-200 bg-amber-50/60"
                          : "border-gray-100 bg-gray-50/80"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                        {label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-800">{q.text}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          {q.marks != null && <span>{q.marks} marks</span>}
                          {showMap && (
                            <span
                              className={
                                mapped
                                  ? "font-medium text-emerald-700"
                                  : amb
                                    ? "font-medium text-amber-700"
                                    : "text-gray-400"
                              }
                            >
                              {mapped ? "Mapped" : amb ? "Ambiguous" : "Not yet"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4L12 0z" />
    </svg>
  );
}
