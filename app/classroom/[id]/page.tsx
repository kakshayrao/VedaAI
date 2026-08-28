"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { BackLink } from "@/components/BackLink";
import type { Classroom, Exam } from "@/lib/types";

export default function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // undefined = still loading, null = confirmed missing
  const [cls, setCls] = useState<Classroom | null | undefined>(undefined);
  const [exams, setExams] = useState<Exam[]>([]);
  const [studentName, setStudentName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [examTitle, setExamTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [cRes, eRes] = await Promise.all([
      fetch(`/api/school/classrooms/${id}`),
      fetch(`/api/school/exams?classroomId=${id}`),
    ]);
    if (!cRes.ok) {
      setCls(null);
      return;
    }
    setCls(await cRes.json());
    setExams(eRes.ok ? await eRes.json() : []);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const addStudent = async () => {
    if (!studentName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/school/classrooms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addStudent: { name: studentName.trim(), rollNo: rollNo.trim() || undefined },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStudentName("");
      setRollNo("");
      setCls(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const removeStudent = async (studentId: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/school/classrooms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeStudentId: studentId }),
      });
      if (res.ok) setCls(await res.json());
    } finally {
      setBusy(false);
    }
  };

  const createExam = async () => {
    if (!examTitle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/school/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classroomId: id, title: examTitle.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      const exam = (await res.json()) as Exam;
      setExamTitle("");
      await load();
      window.location.href = `/classroom/${id}/exams/${exam.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (cls === undefined) {
    return (
      <AppShell>
        <div className="px-8 py-16 text-center text-sm text-gray-400">Loading class…</div>
      </AppShell>
    );
  }
  if (!cls) {
    return (
      <AppShell>
        <div className="px-8 py-16 text-center text-sm text-gray-500">
          Class not found. <BackLink href="/classroom">Back to classrooms</BackLink>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 md:px-8">
        <div>
          <BackLink href="/classroom">Back to classrooms</BackLink>
          <h1 className="mt-3 text-xl font-semibold text-gray-900">{cls.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{cls.students.length} students</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-800">
            Students
          </div>
          <div className="flex flex-wrap gap-2 border-b border-gray-50 px-5 py-3">
            <input
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value)}
              placeholder="Roll"
              className="w-20 rounded-full border border-gray-200 px-3 py-1.5 text-sm"
            />
            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Student name"
              className="min-w-[160px] flex-1 rounded-full border border-gray-200 px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              disabled={busy || !studentName.trim()}
              onClick={addStudent}
              className="rounded-full bg-black px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            >
              Add
            </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-5 py-2 font-medium">Roll</th>
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-5 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {cls.students.map((s) => (
                <tr key={s.id} className="border-t border-gray-50">
                  <td className="px-5 py-2.5 text-gray-500">{s.rollNo || "—"}</td>
                  <td className="px-5 py-2.5 font-medium text-gray-900">{s.name}</td>
                  <td className="px-5 py-2.5 text-right">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeStudent(s.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {cls.students.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-center text-xs text-gray-400">
                    No students yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-800">
            Exams
          </div>
          <div className="flex flex-wrap gap-2 border-b border-gray-50 px-5 py-3">
            <input
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              placeholder="Exam title"
              className="min-w-[160px] flex-1 rounded-full border border-gray-200 px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              disabled={busy || !examTitle.trim()}
              onClick={createExam}
              className="rounded-full bg-black px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            >
              Create exam
            </button>
          </div>
          <ul className="divide-y divide-gray-50">
            {exams.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/classroom/${id}/exams/${e.id}`}
                  className="flex items-center justify-between px-5 py-3 text-sm hover:bg-orange-50/40"
                >
                  <div>
                    <p className="font-medium text-gray-900">{e.title}</p>
                    <p className="text-xs text-gray-500">
                      {e.status}
                      {e.questionSetId ? " · Q paper attached" : " · needs question paper"}
                    </p>
                  </div>
                  <span className="text-orange-600">Open →</span>
                </Link>
              </li>
            ))}
            {exams.length === 0 && (
              <li className="px-5 py-6 text-center text-xs text-gray-400">No exams yet.</li>
            )}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
