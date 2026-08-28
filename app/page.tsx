"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getAssignments } from "@/lib/local-store";
import type { Classroom, JobSummary } from "@/lib/types";

export default function HomePage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [pendingReview, setPendingReview] = useState(0);
  const [graded, setGraded] = useState(0);
  const [classCount, setClassCount] = useState(0);

  useEffect(() => {
    const assignments = getAssignments();
    setPendingReview(assignments.filter((a) => a.status === "active").length);
    setGraded(assignments.filter((a) => a.status === "graded").length);
    fetch("/api/jobs")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: JobSummary[]) => setJobs(Array.isArray(data) ? data : []))
      .catch(() => setJobs([]));
    fetch("/api/school/classrooms")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Classroom[]) => setClassCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setClassCount(0));
  }, []);

  const mapped = jobs.filter((j) => j.status === "ready" || j.status === "grading").length;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
            <p className="mt-1 text-sm text-gray-500">
              Map answer sheets, manage classes, and use AI teaching tools.
            </p>
          </div>
          <Link
            href="/exams"
            className="inline-flex items-center justify-center rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-900"
          >
            Start new mapping →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Papers mapped" value={String(mapped || jobs.length)} />
          <Stat label="Pending review" value={String(pendingReview)} />
          <Stat label="Classes" value={String(classCount)} />
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Recent exams</h2>
            <Link href="/exams" className="text-xs font-medium text-orange-600">
              View all
            </Link>
          </div>
          {jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
              <p className="text-sm text-gray-500">No exams yet. Upload a paper to get started.</p>
              <Link
                href="/exams"
                className="mt-4 inline-flex rounded-full bg-black px-5 py-2 text-sm font-medium text-white"
              >
                Go to Exams
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {jobs.slice(0, 5).map((j) => (
                <li key={j.id}>
                  <Link
                    href={`/exams/${j.id}`}
                    className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm hover:border-orange-200"
                  >
                    <div>
                      <p className="font-medium">{j.questionName || j.id.slice(0, 8)}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(j.createdAt).toLocaleString()} · {j.status}
                      </p>
                    </div>
                    <span className="text-orange-600">Open →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Quick links</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Quick href="/classroom" title="My Classroom" sub={`${classCount} classes`} />
            <Quick href="/assignments" title="Assignments" sub={`${graded} graded`} />
            <Quick href="/library" title="My Library" sub="Papers & materials" />
            <Quick href="/toolkit" title="AI Toolkit" sub="Generate & rewrite" />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4">
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}

function Quick({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-gray-200 bg-white px-4 py-4 hover:border-orange-200"
    >
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="mt-1 text-xs text-gray-500">{sub}</p>
    </Link>
  );
}
