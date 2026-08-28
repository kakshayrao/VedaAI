"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import type { AssignmentStatus, DemoAssignment } from "@/lib/demo-data";
import { getAssignments, upsertAssignment } from "@/lib/local-store";

export default function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [item, setItem] = useState<DemoAssignment | null>(null);

  useEffect(() => {
    setItem(getAssignments().find((a) => a.id === id) ?? null);
  }, [id]);

  if (!item) {
    return (
      <AppShell>
        <div className="px-8 py-16 text-center text-sm text-gray-500">
          Assignment not found.{" "}
          <Link href="/assignments" className="text-orange-600">
            Back
          </Link>
        </div>
      </AppShell>
    );
  }

  const setStatus = (status: AssignmentStatus) => {
    const next = { ...item, status };
    upsertAssignment(next);
    setItem(next);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <Link href="/assignments" className="text-xs font-medium text-orange-600">
          ← Assignments
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-gray-900">{item.title}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {item.className} · Due {item.dueDate}
        </p>
        <p className="mt-4 text-sm text-gray-700">{item.description}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Card label="Status" value={item.status} />
          <Card label="Submissions" value={`${item.submissions}/${item.total}`} />
          <Card label="Class" value={item.className} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {item.status === "draft" && (
            <button
              type="button"
              onClick={() => setStatus("active")}
              className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white"
            >
              Publish
            </button>
          )}
          {item.status === "active" && (
            <button
              type="button"
              onClick={() => setStatus("graded")}
              className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white"
            >
              Mark graded
            </button>
          )}
          <Link
            href="/exams"
            className="rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-800"
          >
            Map answer sheets
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium capitalize text-gray-900">{value}</p>
    </div>
  );
}
