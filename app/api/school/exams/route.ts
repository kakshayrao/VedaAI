import { NextRequest, NextResponse } from "next/server";
import { createExam, listExams } from "@/lib/school";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const classroomId = req.nextUrl.searchParams.get("classroomId") || undefined;
  return NextResponse.json(await listExams(classroomId));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const classroomId = String(body.classroomId || "");
  const title = String(body.title || "").trim();
  if (!classroomId || !title) {
    return NextResponse.json({ error: "classroomId and title required" }, { status: 400 });
  }
  const exam = await createExam({
    classroomId,
    title,
    questionSetId: body.questionSetId ? String(body.questionSetId) : undefined,
  });
  if (!exam) return NextResponse.json({ error: "classroom not found" }, { status: 404 });
  return NextResponse.json(exam);
}
