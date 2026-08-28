"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { RegionDrawer } from "@/components/RegionDrawer";
import type { AnalysisResult, AnswerRegion, StudentAnswer } from "@/lib/types";
import { displayQuestionLabel } from "@/lib/questions/postprocess";
import { bodyRegions } from "@/lib/answers/merge-blocks";
import { needsReviewStatus } from "@/lib/map-answers";
import { boxToPercent, polygonPointsInBox } from "@/lib/regions";

export function AnswerSheetViewer({
  result,
  selectedQuestionId,
  selectedAnswerId,
  page,
  zoom,
  onPageChange,
  onZoomChange,
  onSelectAnswer,
  drawMode,
  onDrawComplete,
}: {
  result: AnalysisResult;
  selectedQuestionId: string | null;
  selectedAnswerId?: string | null;
  page: number;
  zoom: number;
  onPageChange: (p: number) => void;
  onZoomChange: (z: number) => void;
  onSelectAnswer: (answerId: string) => void;
  drawMode?: boolean;
  onDrawComplete?: (region: AnswerRegion) => void;
}) {
  const pages = result.answerPages;
  const asset = pages.find((p) => p.page === page) || pages[0];
  const total = pages.length || 1;
  const activeRef = useRef<HTMLButtonElement | null>(null);

  const answersOnPage = result.answers.filter((a) =>
    bodyRegions(a.regions).some((r) => r.page === (asset?.page ?? page))
  );

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [selectedQuestionId, selectedAnswerId, page, zoom]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Answer Sheet</h2>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <div className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1">
            <button type="button" onClick={() => onZoomChange(Math.max(50, zoom - 10))} className="px-1">
              −
            </button>
            <span className="min-w-[3rem] text-center text-xs">{zoom}%</span>
            <button type="button" onClick={() => onZoomChange(Math.min(200, zoom + 10))} className="px-1">
              +
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="disabled:opacity-30"
            >
              ‹
            </button>
            <span className="text-xs">
              Page {asset?.page ?? page} of {total}
            </span>
            <button
              type="button"
              disabled={page >= total}
              onClick={() => onPageChange(page + 1)}
              className="disabled:opacity-30"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="relative flex-1 overflow-auto bg-gray-100 p-4">
        {asset ? (
          <div
            className="relative mx-auto origin-top"
            style={{ width: `${zoom}%`, maxWidth: "100%" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.url}
              alt={`Answer page ${asset.page}`}
              className="w-full rounded-lg shadow-sm"
              draggable={false}
            />
            <Overlay
              answers={answersOnPage}
              page={asset.page}
              result={result}
              selectedQuestionId={selectedQuestionId}
              selectedAnswerId={selectedAnswerId}
              activeRef={activeRef}
              onSelectAnswer={onSelectAnswer}
            />
            {drawMode && onDrawComplete && (
              <RegionDrawer page={asset.page} onComplete={onDrawComplete} />
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No answer pages</p>
        )}
      </div>
    </div>
  );
}

function Overlay({
  answers,
  page,
  result,
  selectedQuestionId,
  selectedAnswerId,
  activeRef,
  onSelectAnswer,
}: {
  answers: StudentAnswer[];
  page: number;
  result: AnalysisResult;
  selectedQuestionId: string | null;
  selectedAnswerId?: string | null;
  activeRef: MutableRefObject<HTMLButtonElement | null>;
  onSelectAnswer: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {answers.map((ans) =>
        bodyRegions(ans.regions)
          .filter((r) => r.page === page)
          .map((r, i) => {
            const q = result.questions.find((x) => x.id === ans.mapping.questionId);
            const label = q ? displayQuestionLabel(q) : ans.detectedLabel || "?";
            const review = needsReviewStatus(ans.mapping.status);
            const active =
              selectedAnswerId === ans.id ||
              (!!selectedQuestionId && ans.mapping.questionId === selectedQuestionId);
            const hasPoly = !!(r.polygon && r.polygon.length > 2);
            const style = boxToPercent(r.box);
            const tone = review
              ? active
                ? "border-amber-500 bg-amber-400/30 ring-2 ring-amber-400/60"
                : "border-amber-400/80 bg-amber-400/15"
              : active
                ? "border-emerald-500 bg-emerald-400/25 ring-2 ring-emerald-400/60"
                : "border-emerald-400/70 bg-emerald-400/15";
            const badge = review ? "bg-amber-500" : "bg-emerald-500";
            const polyFill = review ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)";
            const polyStroke = review ? "rgb(245,158,11)" : "rgb(16,185,129)";
            return (
              <button
                key={`${ans.id}-${i}`}
                ref={active && i === 0 ? activeRef : undefined}
                type="button"
                className={`pointer-events-auto absolute border-2 ${
                  hasPoly ? "rounded-none border-transparent bg-transparent" : `rounded-md ${tone}`
                } ${active && hasPoly ? "z-10" : ""}`}
                style={style}
                onClick={() => onSelectAnswer(ans.id)}
              >
                <span
                  className={`absolute -left-1 -top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shadow ${badge} ${
                    active ? "ring-2 ring-white" : ""
                  }`}
                >
                  Q{label}
                </span>
                {hasPoly ? (
                  <svg
                    className="absolute inset-0 h-full w-full overflow-visible"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <polygon
                      points={polygonPointsInBox(r.polygon!, r.box)}
                      fill={polyFill}
                      stroke={polyStroke}
                      strokeWidth={active ? 2.5 : 1.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                ) : null}
              </button>
            );
          })
      )}
    </div>
  );
}
