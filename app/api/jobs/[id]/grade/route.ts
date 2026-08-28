import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { getJob } from "@/lib/jobs";
import { gradeAnswers } from "@/lib/grade";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const job = await getJob(id);
  if (!job?.result) return NextResponse.json({ error: "not ready" }, { status: 400 });

  const work = gradeAnswers(id);
  try {
    waitUntil(work);
  } catch {
    /* */
  }
  void work;

  return NextResponse.json({ ok: true, status: "grading" });
}
