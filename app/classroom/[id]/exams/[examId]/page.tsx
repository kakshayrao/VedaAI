"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BackLink } from "@/components/BackLink";
import { questionSetLabel } from "@/lib/question-set-utils";
import type {
  Classroom,
  Exam,
  ExamSubmission,
  JobState,
  QuestionSetSummary,
  Student,
} from "@/lib/types";
import { uploadFileError, uploadJobFile } from "@/lib/client-upload";

type Row = {
  student: Student;
  submission?: ExamSubmission;
  job?: JobState | null;
};

type RowUi =
  | "missing"
  | "uploading"
  | "processing"
  | "needs_review"
  | "ready"
  | "error";

function needsReview(job?: JobState | null): boolean {
  const s = job?.result?.summary;
  if (!s) return false;
  return s.unmatched + s.unlabelled + s.ambiguous > 0;
}

function rowUi(row: Row, uploading: boolean): RowUi {
  if (uploading) return "uploading";
  const status = row.submission?.status ?? "missing";
  if (status === "missing") return "missing";
  if (status === "error" || row.job?.status === "error") return "error";
  if (status === "processing") return "processing";
  if (status === "ready") return needsReview(row.job) ? "needs_review" : "ready";
  return "missing";
}

const STATUS_LABEL: Record<RowUi, string> = {
  missing: "Missing",
  uploading: "Uploading",
  processing: "Processing",
  needs_review: "Needs review",
  ready: "Ready",
  error: "Error",
};

const STATUS_CLASS: Record<RowUi, string> = {
  missing: "bg-gray-100 text-gray-600",
  uploading: "bg-orange-50 text-orange-700",
  processing: "bg-amber-50 text-amber-800",
  needs_review: "bg-amber-50 text-amber-800",
  ready: "bg-emerald-50 text-emerald-700",
  error: "bg-red-50 text-red-700",
};

function resultsHref(
  jobId: string,
  classId: string,
  examId: string,
  studentName: string,
  examTitle: string,
  className: string
) {
  const q = new URLSearchParams({
    from: "exam",
    examId,
    classroomId: classId,
    student: studentName,
    exam: examTitle,
    class: className,
  });
  return `/exams/${jobId}?${q.toString()}`;
}

export default function ExamRosterPage({
  params,
}: {
  params: Promise<{ id: string; examId: string }>;
}) {
  const { id: classId, examId } = use(params);
  const router = useRouter();
  // undefined = still loading, null = confirmed missing
  const [cls, setCls] = useState<Classroom | null | undefined>(undefined);
  const [exam, setExam] = useState<Exam | null | undefined>(undefined);
  const [rows, setRows] = useState<Row[]>([]);
  const [sets, setSets] = useState<QuestionSetSummary[]>([]);
  const [selectedSet, setSelectedSet] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadFor, setUploadFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [cRes, eRes, sRes] = await Promise.all([
      fetch(`/api/school/classrooms/${classId}`),
      fetch(`/api/school/exams/${examId}`),
      fetch(`/api/school/exams/${examId}/submissions`),
    ]);
    if (!cRes.ok || !eRes.ok) {
      setCls(null);
      setExam(null);
      return;
    }
    const classroom = (await cRes.json()) as Classroom;
    const data = (await eRes.json()) as { exam: Exam; submissions: ExamSubmission[] };
    const subs = sRes.ok ? ((await sRes.json()) as ExamSubmission[]) : data.submissions;
    setCls(classroom);
    setExam(data.exam);
    if (data.exam.questionSetId) setSelectedSet(data.exam.questionSetId);

    const jobs = await Promise.all(
      subs.map(async (s) => {
        if (!s.jobId) return null;
        const r = await fetch(`/api/jobs/${s.jobId}`);
        return r.ok ? ((await r.json()) as JobState) : null;
      })
    );

    setRows(
      classroom.students.map((student) => {
        const submission = subs.find((s) => s.studentId === student.id);
        const job = submission?.jobId
          ? jobs.find((j) => j?.id === submission.jobId) ?? null
          : null;
        return { student, submission, job };
      })
    );
  }, [classId, examId]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    fetch("/api/question-sets")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: QuestionSetSummary[]) => setSets(Array.isArray(data) ? data : []))
      .catch(() => setSets([]));
  }, []);

  const attachSet = async () => {
    if (!selectedSet) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/school/exams/${examId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionSetId: selectedSet }),
      });
      if (!res.ok) throw new Error(await res.text());
      setExam(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const uploadAnswer = async (student: Student, file: File) => {
    if (!exam?.questionSetId || !cls) {
      setError("Attach a question paper first");
      return;
    }
    const fileErr = uploadFileError(file);
    if (fileErr) {
      setError(`${student.name}: ${fileErr}`);
      return;
    }
    setBusy(true);
    setUploadFor(student.id);
    setError(null);
    try {
      const jobId = crypto.randomUUID();
      const { url, name } = await uploadJobFile(jobId, "answer", file);

      const res = await fetch(`/api/school/exams/${examId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          jobId,
          answerUrl: url,
          answerName: name,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push(
        resultsHref(jobId, classId, examId, student.name, exam.title, cls.name)
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      await load();
    } finally {
      setBusy(false);
      setUploadFor(null);
    }
  };

  const resume = async (jobId: string) => {
    setBusy(true);
    try {
      await fetch(`/api/jobs/${jobId}/resume`, { method: "POST" });
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (cls === undefined || exam === undefined) {
    return (
      <AppShell>
        <div className="px-8 py-16 text-center text-sm text-gray-400">Loading exam…</div>
      </AppShell>
    );
  }
  if (!cls || !exam) {
    return (
      <AppShell>
        <div className="px-8 py-16 text-center text-sm text-gray-500">
          Exam not found.{" "}
          <BackLink href={`/classroom/${classId}`}>Back to class</BackLink>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <BackLink href={`/classroom/${classId}`}>Back to class</BackLink>
            <h1 className="mt-3 text-xl font-semibold text-gray-900">{exam.title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {cls.name}
              {" · "}
              {exam.status}
              {exam.questionSetId ? " · question paper attached" : ""}
            </p>
          </div>
          <a
            href={`/api/school/exams/${examId}?export=csv`}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:border-orange-200"
          >
            Download CSV
          </a>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-800">Question paper</h2>
          <p className="mt-1 text-xs text-gray-500">
            Attach once for the whole class. Students only need answer sheets.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              value={selectedSet}
              onChange={(e) => setSelectedSet(e.target.value)}
              className="min-w-[220px] flex-1 rounded-full border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Select saved question set…</option>
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {questionSetLabel({
                    title: s.title,
                    questionCount: s.questionCount,
                    createdAt: s.createdAt,
                  })}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !selectedSet}
              onClick={attachSet}
              className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Attach
            </button>
            <Link
              href="/exams"
              className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:border-orange-200"
            >
              Extract new paper →
            </Link>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-800">
            Student submissions
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Roll</th>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Score</th>
                  <th className="px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const { student, submission, job } = row;
                  const ui = rowUi(row, uploadFor === student.id);
                  const score =
                    submission?.scores?.total != null
                      ? `${submission.scores.total}${
                          submission.scores.max != null ? ` / ${submission.scores.max}` : ""
                        }`
                      : "—";
                  const openHref = submission?.jobId
                    ? resultsHref(
                        submission.jobId,
                        classId,
                        examId,
                        student.name,
                        exam.title,
                        cls.name
                      )
                    : null;
                  const openLabel =
                    ui === "processing" || ui === "uploading"
                      ? "View progress"
                      : ui === "error"
                        ? "View error"
                        : "Open results";

                  return (
                    <tr key={student.id} className="border-t border-gray-50">
                      <td className="px-4 py-3 text-gray-500">{student.rollNo || "—"}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{student.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[ui]}`}
                        >
                          {STATUS_LABEL[ui]}
                        </span>
                        {job?.message && ui === "processing" ? (
                          <span className="mt-1 block text-[11px] text-gray-400">{job.message}</span>
                        ) : null}
                        {job?.result?.gradingStatus === "pending" &&
                        (ui === "ready" || ui === "needs_review") ? (
                          <span className="mt-1 block text-[11px] font-medium text-orange-600">
                            Grading…
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{score}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <label
                            className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium ${
                              exam.questionSetId
                                ? "border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-300"
                                : "border-gray-100 bg-gray-50 text-gray-400"
                            }`}
                          >
                            {uploadFor === student.id ? "Uploading…" : "Upload answers"}
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              className="hidden"
                              disabled={busy || !exam.questionSetId}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) void uploadAnswer(student, f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          {openHref && (
                            <Link
                              href={openHref}
                              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-800 hover:border-orange-200"
                            >
                              {openLabel}
                            </Link>
                          )}
                          {job?.resumable && submission?.jobId && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => resume(submission.jobId!)}
                              className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 hover:border-orange-300 disabled:opacity-40"
                            >
                              Resume
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-400">
                      Add students on the class page first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
