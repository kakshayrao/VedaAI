import { NextRequest, NextResponse } from "next/server";
import { getExam, listSubmissions, updateExam } from "@/lib/school";
import { getClassroom } from "@/lib/school";
import { getQuestionSet } from "@/lib/question-sets";
import { getJob } from "@/lib/jobs";
import { examRosterCsv, scoreTotals, type ExamRosterRow } from "@/lib/csv-export";
import { displayQuestionLabel } from "@/lib/questions/postprocess";
import type { Exam, Question } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const exam = await getExam(id);
  if (!exam) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (req.nextUrl.searchParams.get("export") === "csv") {
    const cls = await getClassroom(exam.classroomId);
    const subs = await listSubmissions(id);
    let questions: Question[] = [];
    if (exam.questionSetId) {
      const set = await getQuestionSet(exam.questionSetId);
      questions = set?.questions ?? [];
    }

    const rows: ExamRosterRow[] = [];
    for (const st of cls?.students ?? []) {
      const sub = subs.find((s) => s.studentId === st.id);
      const row: ExamRosterRow = {
        rollNo: st.rollNo,
        name: st.name,
        status: sub?.status ?? "missing",
        totalScore: sub?.scores?.total,
        maxScore: sub?.scores?.max,
        unanswered: sub?.scores?.unanswered,
        perQuestion: {},
      };
      if (sub?.jobId && questions.length) {
        const job = await getJob(sub.jobId);
        if (job?.result) {
          const t = scoreTotals(job.result);
          row.totalScore = t.total;
          row.maxScore = t.max;
          row.unanswered = t.unanswered;
          row.perQuestion = Object.fromEntries(
            questions.map((q) => {
              const label = displayQuestionLabel(q);
              return [label, t.perQuestion[label]];
            })
          );
        }
      }
      rows.push(row);
    }

    const csv = examRosterCsv(questions, rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="exam-${id.slice(0, 8)}.csv"`,
      },
    });
  }

  const submissions = await listSubmissions(id);
  return NextResponse.json({ exam, submissions });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const patch: Partial<Pick<Exam, "title" | "questionSetId" | "status">> = {};
  if (body.title != null) patch.title = String(body.title).slice(0, 300);
  if (body.questionSetId != null) {
    const setId = String(body.questionSetId);
    if (!(await getQuestionSet(setId))) {
      return NextResponse.json({ error: "question set not found" }, { status: 400 });
    }
    patch.questionSetId = setId;
  }
  if (body.status != null) {
    if (!["draft", "active", "closed"].includes(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    patch.status = body.status;
  }
  const exam = await updateExam(id, patch);
  if (!exam) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(exam);
}
