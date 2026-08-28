import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getJob, saveJob } from "@/lib/jobs";
import { buildSummary } from "@/lib/map-answers";

export const runtime = "nodejs";

const coord = z.number().min(0).max(1000);

const RegionSchema = z.object({
  page: z.number().int().min(1),
  kind: z.enum(["label", "body"]),
  box: z.tuple([coord, coord, coord, coord]),
  polygon: z.array(z.tuple([coord, coord])).optional(),
});

const BodySchema = z.object({
  questionId: z.string().nullable().optional(),
  regions: z.array(RegionSchema).min(1).optional(),
  detectedLabel: z.string().max(50).optional(),
});

/** Manual remap and/or region edit. */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; answerId: string }> }
) {
  const { id, answerId } = await ctx.params;
  const job = await getJob(id);
  if (!job?.result) return NextResponse.json({ error: "not ready" }, { status: 400 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid patch" }, { status: 400 });
  }
  const body = parsed.data;
  if (!job.result.answers.some((a) => a.id === answerId)) {
    return NextResponse.json({ error: "answer not found" }, { status: 404 });
  }
  if (body.questionId && !job.result.questions.some((q) => q.id === body.questionId)) {
    return NextResponse.json({ error: "question not found" }, { status: 400 });
  }

  const answers = job.result.answers.map((a) => {
    if (a.id !== answerId) return a;
    const next = { ...a };
    if (body.questionId !== undefined) {
      next.mapping = body.questionId
        ? { status: "matched", confidence: 1, questionId: body.questionId }
        : { status: "unlabelled", confidence: 0 };
    }
    if (body.regions) next.regions = body.regions;
    if (typeof body.detectedLabel === "string") next.detectedLabel = body.detectedLabel;
    return next;
  });

  const result = {
    ...job.result,
    answers,
    summary: buildSummary(job.result.questions, answers),
  };

  const next = { ...job, result };
  await saveJob(next);
  return NextResponse.json(next);
}
