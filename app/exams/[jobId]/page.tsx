"use client";

import { use } from "react";
import { AppShell } from "@/components/AppShell";
import { ExamsFlow } from "@/components/ExamsFlow";

type Sp = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default function ExamJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<Sp>;
}) {
  const { jobId } = use(params);
  const sp = use(searchParams);
  const fromExam = first(sp.from) === "exam";
  const examId = first(sp.examId);
  const classroomId = first(sp.classroomId);
  const student = first(sp.student);
  const examTitle = first(sp.exam);
  const className = first(sp.class);

  const examContext =
    fromExam && examId && classroomId
      ? {
          examId,
          classroomId,
          studentName: student,
          examTitle,
          className,
        }
      : undefined;

  return (
    <AppShell compact>
      <ExamsFlow
        initialJobId={jobId}
        showPastJobs={false}
        examContext={examContext}
      />
    </AppShell>
  );
}
