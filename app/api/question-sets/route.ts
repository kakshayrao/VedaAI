import { NextResponse } from "next/server";
import { listQuestionSets } from "@/lib/question-sets";

export const runtime = "nodejs";

export async function GET() {
  const sets = await listQuestionSets();
  return NextResponse.json(sets);
}
