import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { getExam, listSubmissions, upsertSubmission, syncSubmissionFromJob } from "@/lib/school";
import { isStoredDocumentUrl } from "@/lib/blob";
import { getJob, saveJob } from "@/lib/jobs";
import { runPipeline } from "@/lib/pipeline";
import type { JobState } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const exam = await getExam(id);
  if (!exam) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Refresh processing submissions from jobs
  const subs = await listSubmissions(id);
  const refreshed = await Promise.all(
    subs.map(async (s) => {
      if (!s.jobId || (s.status !== "processing" && s.status !== "error")) return s;
      const job = await getJob(s.jobId);
      if (!job) return s;
      return (await syncSubmissionFromJob(s.id, job)) ?? s;
    })
  );
  return NextResponse.json(refreshed);
}

/** Start answer-only extract for one student on this exam. */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: examId } = await ctx.params;
  const exam = await getExam(examId);
  if (!exam) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!exam.questionSetId) {
    return NextResponse.json({ error: "attach a question set first" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const studentId = String(body.studentId || "");
  const answerUrl = String(body.answerUrl || "");
  const answerName = body.answerName ? String(body.answerName).slice(0, 300) : undefined;
  if (!studentId || !answerUrl) {
    return NextResponse.json({ error: "studentId and answerUrl required" }, { status: 400 });
  }
  if (!isStoredDocumentUrl(answerUrl)) {
    return NextResponse.json({ error: "unrecognized document URL" }, { status: 400 });
  }

  const jobId = /^[A-Za-z0-9-]{1,64}$/.test(String(body.jobId || ""))
    ? String(body.jobId)
    : crypto.randomUUID();
  const job: JobState = {
    id: jobId,
    status: "uploading",
    progress: 0,
    message: "Starting…",
    createdAt: new Date().toISOString(),
    answerUrl,
    answerName,
    questionSetId: exam.questionSetId,
  };
  await saveJob(job);

  const sub = await upsertSubmission({
    examId,
    studentId,
    jobId,
    status: "processing",
  });

  const work = runPipeline(jobId).then(async () => {
    const j = await getJob(jobId);
    if (j) await syncSubmissionFromJob(sub.id, j);
  });
  try {
    waitUntil(work);
  } catch {
    /* non-Vercel */
  }
  void work;

  return NextResponse.json({ submission: sub, jobId });
}
