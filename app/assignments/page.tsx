"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DEMO_CLASSES, type AssignmentStatus, type DemoAssignment } from "@/lib/demo-data";
import { getAssignments, upsertAssignment } from "@/lib/local-store";

const STATUS_STYLE: Record<AssignmentStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-orange-50 text-orange-700",
  graded: "bg-emerald-50 text-emerald-700",
};

export default function AssignmentsPage() {
  const [list, setList] = useState<DemoAssignment[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState(DEMO_CLASSES[0].id);

  useEffect(() => {
    setList(getAssignments());
  }, []);

  const create = () => {
    if (!title.trim()) return;
    const cls = DEMO_CLASSES.find((c) => c.id === classId)!;
    const a: DemoAssignment = {
      id: crypto.randomUUID(),
      title: title.trim(),
      classId: cls.id,
      className: cls.name,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      status: "draft",
      submissions: 0,
      total: cls.studentCount,
      description: "Created from Assignments.",
    };
    setList(upsertAssignment(a));
    setTitle("");
    setCreating(false);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Assignments</h1>
            <p className="mt-1 text-sm text-gray-500">
              Lightweight notes. For roster + answer sheets + CSV, use{" "}
              <Link href="/classroom" className="font-medium text-orange-600 hover:underline">
                Classroom exams
              </Link>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white"
          >
            {creating ? "Cancel" : "Create"}
          </button>
        </div>

        {creating && (
          <div className="mt-4 space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Assignment title"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-300"
            />
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            >
              {DEMO_CLASSES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={create}
              className="rounded-full bg-orange-500 px-5 py-2 text-sm font-medium text-white"
            >
              Save draft
            </button>
          </div>
        )}

        <ul className="mt-6 space-y-3">
          {list.map((a) => (
            <li key={a.id}>
              <Link
                href={`/assignments/${a.id}`}
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-4 hover:border-orange-200"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{a.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[a.status]}`}>
                      {a.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {a.className} · Due {a.dueDate} · {a.submissions}/{a.total} submitted
                  </p>
                </div>
                <span className="text-sm text-orange-600">View →</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
