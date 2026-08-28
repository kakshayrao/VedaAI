import { NextRequest, NextResponse } from "next/server";
import { getQuestionSet } from "@/lib/question-sets";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const set = await getQuestionSet(id);
  if (!set) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(set);
}
