import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";
import { jobQuestionCsv } from "@/lib/csv-export";

export const runtime = "nodejs";

/** Download question-level CSV for a completed job. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const job = await getJob(id);
  if (!job?.result) {
    return NextResponse.json({ error: "job not ready" }, { status: 404 });
  }
  const csv = jobQuestionCsv(job.result);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="job-${id.slice(0, 8)}-scores.csv"`,
    },
  });
}
