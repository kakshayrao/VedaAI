"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UploadPanel, type UploadStart } from "@/components/UploadPanel";
import { ExtractingState } from "@/components/ExtractingState";
import { QuestionList } from "@/components/QuestionList";
import { AnswerSheetViewer } from "@/components/AnswerSheetViewer";
import { AnswerPreviewCard } from "@/components/AnswerPreviewCard";
import { UnmatchedPanel, needsReviewStatus } from "@/components/UnmatchedPanel";
import { MappingCorrection } from "@/components/MappingCorrection";
import { GradingSummary } from "@/components/GradingSummary";
import type { AnswerRegion, JobState, JobSummary } from "@/lib/types";
import { displayQuestionLabel } from "@/lib/questions/postprocess";
import { pushNotification } from "@/lib/local-store";

type Phase = "upload" | "extracting" | "results";

export function ExamsFlow({
  initialJobId,
  showPastJobs = true,
}: {
  initialJobId?: string;
  showPastJobs?: boolean;
}) {
  const router = useRouter();
  const mapNewInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>(initialJobId ? "extracting" : "upload");
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<JobState | null>(
    initialJobId
      ? { id: initialJobId, status: "converting", progress: 0, message: "Loading…", createdAt: new Date().toISOString() }
      : null
  );
  const [error, setError] = useState<string | null>(null);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [pastJobs, setPastJobs] = useState<JobSummary[]>([]);

  const [selectedQ, setSelectedQ] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [mobileTab, setMobileTab] = useState<"questions" | "sheet">("questions");
  const [reviewAnswerId, setReviewAnswerId] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState(false);

  useEffect(() => {
    if (!showPastJobs || phase !== "upload") return;
    fetch("/api/jobs")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: JobSummary[]) => setPastJobs(Array.isArray(data) ? data : []))
      .catch(() => setPastJobs([]));
  }, [showPastJobs, phase]);

  const start = async (payload: UploadStart) => {
    setBusy(true);
    setError(null);
    try {
      const jobId = crypto.randomUUID();
      const upload = async (file: File, kind: string) => {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("jobId", jobId);
        fd.set("kind", kind);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<{ url: string; name: string }>;
      };
      const a = await upload(payload.answer, "answer");
      const body =
        payload.mode === "saved"
          ? {
              jobId,
              answerUrl: a.url,
              answerName: a.name,
              questionSetId: payload.questionSetId,
            }
          : await (async () => {
              const q = await upload(payload.question, "question");
              return {
                jobId,
                questionUrl: q.url,
                answerUrl: a.url,
                questionName: q.name,
                answerName: a.name,
              };
            })();
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      setPhase("extracting");
      setJob({
        id: jobId,
        status: "converting",
        progress: 0,
        message: "Converting pages…",
        createdAt: new Date().toISOString(),
      });
      router.replace(`/exams/${jobId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (phase !== "extracting" || !job?.id) return;
    let cancelled = false;
    const tick = async () => {
      const res = await fetch(`/api/jobs/${job.id}`);
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as JobState;
      setJob(data);
      if (data.status === "ready" && data.result) {
        setPhase("results");
        pushNotification({
          id: `ready-${data.id}`,
          title: "Job ready",
          body: `Mapping finished for ${data.questionName || "exam"}.`,
          href: `/exams/${data.id}`,
        });
        const first = data.result.questions[0]?.id ?? null;
        setSelectedQ(first);
        if (first) setExpanded(new Set([first]));
      } else if (data.status === "error") {
        // Stay on extracting: Resume when checkpoint exists; else re-upload message
        setError(data.error || "Job failed");
      }
    };
    tick();
    const id = setInterval(tick, 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [phase, job?.id]);

  const resume = async () => {
    if (!job?.id) return;
    setResumeBusy(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/resume`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      setJob((j) =>
        j
          ? {
              ...j,
              status: "extracting_questions",
              message: "Resuming…",
              error: undefined,
              resumable: false,
            }
          : j
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setResumeBusy(false);
    }
  };

  useEffect(() => {
    if (phase !== "results" || !job?.id) return;
    if (job.result?.gradingStatus === "done") {
      pushNotification({
        id: `grade-${job.id}`,
        title: "Grading complete",
        body: `Assistive grading ready for ${job.questionName || "exam"}.`,
        href: `/exams/${job.id}`,
      });
      return;
    }
    if (job.result?.gradingStatus === "skipped" || job.result?.gradingStatus === "error") return;
    const id = setInterval(async () => {
      const res = await fetch(`/api/jobs/${job.id}`);
      if (!res.ok) return;
      const data = (await res.json()) as JobState;
      setJob(data);
    }, 2500);
    return () => clearInterval(id);
  }, [phase, job?.id, job?.result?.gradingStatus, job?.questionName]);

  const result = job?.result;

  const answerForSelected = useMemo(() => {
    if (!result || !selectedQ) return null;
    return result.answers.find((a) => a.mapping.questionId === selectedQ) ?? null;
  }, [result, selectedQ]);

  const selectedLabel = useMemo(() => {
    const q = result?.questions.find((x) => x.id === selectedQ);
    return q ? displayQuestionLabel(q) : "";
  }, [result, selectedQ]);

  useEffect(() => {
    if (!answerForSelected) return;
    const p = answerForSelected.regions.find((r) => r.kind === "body")?.page;
    if (p) setPage(p);
  }, [answerForSelected]);

  const onSelectAnswer = useCallback(
    (answerId: string) => {
      const ans = result?.answers.find((a) => a.id === answerId);
      if (!ans) return;
      if (ans.mapping.questionId) {
        setSelectedQ(ans.mapping.questionId);
        setExpanded((s) => new Set(s).add(ans.mapping.questionId!));
      }
      const p = ans.regions.find((r) => r.kind === "body")?.page ?? ans.regions[0]?.page;
      if (p) setPage(p);
      setReviewAnswerId(needsReviewStatus(ans.mapping.status) ? answerId : null);
      setMobileTab("sheet");
    },
    [result]
  );

  const patchAnswer = async (answerId: string, body: Record<string, unknown>) => {
    if (!job) return;
    const res = await fetch(`/api/jobs/${job.id}/answers/${answerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    const data = (await res.json()) as JobState;
    setJob(data);
  };

  return (
    <>
      {phase === "upload" && (
        <>
          <UploadPanel onStart={start} busy={busy} />
          {error && <p className="px-4 pb-4 text-center text-sm text-red-600">{error}</p>}
          {showPastJobs && pastJobs.length > 0 && (
            <section className="mx-auto max-w-3xl px-4 pb-10">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">Past exams</h2>
              <ul className="space-y-2">
                {pastJobs.map((j) => (
                  <li key={j.id}>
                    <Link
                      href={`/exams/${j.id}`}
                      className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm hover:border-orange-200"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {j.questionName || `Job ${j.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(j.createdAt).toLocaleString()} · {j.status}
                          {j.summary ? ` · ${j.summary.answered} answered` : ""}
                        </p>
                      </div>
                      <span className="text-orange-600">Open →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {phase === "extracting" && (
        <ExtractingState
          message={job?.message}
          error={job?.status === "error" ? job.error || error : null}
          resumable={job?.resumable}
          progress={job?.progress}
          lastQuestionPage={job?.checkpoint?.lastQuestionPage}
          questionPageCount={job?.checkpoint?.questionPages?.length}
          lastAnswerPage={job?.checkpoint?.lastAnswerPage}
          answerPageCount={job?.checkpoint?.answerPages?.length}
          questions={job?.result?.questions}
          answers={job?.result?.answers}
          onResume={resume}
          resumeBusy={resumeBusy}
          onBackToUpload={() => {
            setPhase("upload");
            setError(null);
            setJob(null);
            router.replace("/exams");
          }}
        />
      )}

      {phase === "results" && result && (
        <div className="flex h-[calc(100vh-57px)] flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-white px-4 py-2 text-xs text-gray-500">
            <span>{job?.questionName || "Exam results"}</span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {job?.id && (
                <a
                  href={`/api/jobs/${job.id}/export`}
                  className="font-medium text-gray-600 hover:underline"
                >
                  Download CSV
                </a>
              )}
              <Link href="/exams" className="font-medium text-gray-600 hover:underline">
                New mapping
              </Link>
              <input
                ref={mapNewInputRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f || !job?.questionSetId) return;
                  void start({ mode: "saved", questionSetId: job.questionSetId, answer: f });
                }}
              />
              <button
                type="button"
                disabled={busy || !job?.questionSetId}
                title={
                  job?.questionSetId
                    ? "Reuse this question paper; upload only a new answer sheet"
                    : "Question set not saved on this job yet"
                }
                onClick={() => mapNewInputRef.current?.click()}
                className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Uploading…" : "Map a new answer sheet"}
              </button>
            </div>
          </div>
          {job?.questionSetId && (
            <p className="border-b border-orange-100 bg-orange-50 px-4 py-2 text-xs text-orange-900">
              Same question paper is saved. Use <strong>Map a new answer sheet</strong> to grade
              another student without re-extracting questions.
            </p>
          )}
          <GradingSummary result={result} />
          <UnmatchedPanel
            result={result}
            activeAnswerId={reviewAnswerId}
            onSelectAnswer={onSelectAnswer}
          />

          <div className="flex border-b border-gray-200 bg-white md:hidden">
            {(["questions", "sheet"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMobileTab(t)}
                className={`flex-1 py-2.5 text-sm font-medium ${
                  mobileTab === t ? "border-b-2 border-orange-500 text-orange-600" : "text-gray-500"
                }`}
              >
                {t === "questions" ? "Questions" : "Answer Sheet"}
              </button>
            ))}
          </div>

          <div className="grid min-h-0 flex-1 md:grid-cols-2">
            <div
              className={`min-h-0 overflow-hidden border-r border-gray-200 bg-white ${
                mobileTab === "questions" ? "block" : "hidden md:block"
              }`}
            >
              <QuestionList
                result={result}
                selectedId={selectedQ}
                expanded={expanded}
                onSelect={(id) => {
                  setSelectedQ(id);
                  setMobileTab("sheet");
                  const a = result.answers.find(
                    (x) =>
                      x.mapping.questionId === id && needsReviewStatus(x.mapping.status)
                  );
                  if (a) setReviewAnswerId(a.id);
                  else setReviewAnswerId(null);
                }}
                onToggle={(id) =>
                  setExpanded((s) => {
                    const n = new Set(s);
                    if (n.has(id)) n.delete(id);
                    else n.add(id);
                    return n;
                  })
                }
                onExpandAll={() => setExpanded(new Set(result.questions.map((q) => q.id)))}
              />
            </div>

            <div
              className={`relative min-h-0 bg-white ${
                mobileTab === "sheet" ? "block" : "hidden md:block"
              }`}
            >
              <AnswerSheetViewer
                result={result}
                selectedQuestionId={selectedQ}
                selectedAnswerId={reviewAnswerId}
                page={page}
                zoom={zoom}
                onPageChange={setPage}
                onZoomChange={setZoom}
                onSelectAnswer={onSelectAnswer}
                drawMode={drawMode}
                onDrawComplete={async (region: AnswerRegion) => {
                  if (!reviewAnswerId) return;
                  const ans = result.answers.find((a) => a.id === reviewAnswerId);
                  const regions = [...(ans?.regions || []).filter((r) => r.kind !== "body"), region];
                  await patchAnswer(reviewAnswerId, { regions });
                  setDrawMode(false);
                }}
              />
              {selectedQ && (
                <div className="pointer-events-none absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80">
                  <div className="pointer-events-auto">
                    <AnswerPreviewCard
                      answer={answerForSelected}
                      questionLabel={selectedLabel}
                      onReview={() => {
                        const a = answerForSelected;
                        if (a) {
                          setReviewAnswerId(a.id);
                          setMobileTab("sheet");
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {reviewAnswerId && (
            <MappingCorrection
              result={result}
              answerId={reviewAnswerId}
              onClose={() => {
                setReviewAnswerId(null);
                setDrawMode(false);
              }}
              onRemap={(qid) => patchAnswer(reviewAnswerId, { questionId: qid })}
              onStartDraw={() => {
                setDrawMode(true);
                setMobileTab("sheet");
              }}
            />
          )}
        </div>
      )}
    </>
  );
}
