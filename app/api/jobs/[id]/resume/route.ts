import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { getJob, saveJob } from "@/lib/jobs";
import { runPipeline } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const job = await getJob(id);
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!job.resumable || !job.checkpoint?.questionPages?.length) {
    return NextResponse.json(
      { error: "Job is not resumable — start a new upload" },
      { status: 400 }
    );
  }

  await saveJob({
    ...job,
    status:
      (job.checkpoint.lastQuestionPage || 0) < job.checkpoint.questionPages.length
        ? "extracting_questions"
        : "extracting_answers",
    progress: job.progress || 20,
    message: "Resuming…",
    error: undefined,
    resumable: false,
  });

  const work = runPipeline(id, { resume: true });
  try {
    waitUntil(work);
  } catch {
    /* non-Vercel */
  }
  void work;

  return NextResponse.json({ id, status: "resuming" });
}
