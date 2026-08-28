import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { listJobs, saveJob } from "@/lib/jobs";
import { isStoredDocumentUrl } from "@/lib/blob";
import { getQuestionSet } from "@/lib/question-sets";
import { runPipeline } from "@/lib/pipeline";
import type { JobState } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const safeId = z.string().regex(/^[A-Za-z0-9-]{1,64}$/);
const storedUrl = z.string().max(2000).refine(isStoredDocumentUrl, "unrecognized document URL");

const BodySchema = z.object({
  jobId: safeId.optional(),
  questionUrl: storedUrl.optional(),
  answerUrl: storedUrl,
  questionName: z.string().max(300).optional(),
  answerName: z.string().max(300).optional(),
  questionSetId: safeId.optional(),
});

export async function GET() {
  const jobs = await listJobs();
  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request — answerUrl (and questionUrl or questionSetId) required" },
      { status: 400 }
    );
  }
  const { questionUrl, answerUrl, questionName, answerName, questionSetId } = parsed.data;
  const jobId = parsed.data.jobId || crypto.randomUUID();

  if (!questionUrl && !questionSetId) {
    return NextResponse.json(
      { error: "questionUrl or questionSetId required" },
      { status: 400 }
    );
  }

  let qName = questionName;
  if (questionSetId && !questionUrl) {
    const set = await getQuestionSet(questionSetId);
    if (!set) {
      return NextResponse.json({ error: "question set not found" }, { status: 404 });
    }
    qName = qName || set.title;
  }

  const job: JobState = {
    id: jobId,
    status: "uploading",
    progress: 0,
    message: "Starting…",
    createdAt: new Date().toISOString(),
    questionUrl,
    answerUrl,
    questionName: qName,
    answerName,
    questionSetId,
  };

  await saveJob(job);

  const work = runPipeline(jobId);
  try {
    waitUntil(work);
  } catch {
    /* non-Vercel */
  }
  void work;

  return NextResponse.json({ id: jobId, status: job.status });
}
