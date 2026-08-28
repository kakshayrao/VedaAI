"use client";

import type { AnalysisResult } from "@/lib/types";

export function GradingSummary({ result }: { result: AnalysisResult }) {
  if (!result.gradingSummary && result.gradingStatus === "pending") {
    return (
      <div className="flex items-center gap-2 border-b border-orange-100 bg-orange-50/60 px-4 py-2 text-xs text-orange-800">
        <span className="rounded-full bg-orange-100 px-2 py-0.5 font-semibold text-orange-700">
          Grading…
        </span>
        <span>You can review the mapped sheet while scores finish.</span>
      </div>
    );
  }
  if (!result.gradingSummary) return null;
  return (
    <div className="border-b border-gray-100 bg-white px-4 py-2 text-xs text-gray-600">
      {result.gradingSummary}
    </div>
  );
}
