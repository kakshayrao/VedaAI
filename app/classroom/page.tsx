"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import type { Classroom } from "@/lib/types";

export default function ClassroomPage() {
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    fetch("/api/school/classrooms")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Classroom[]) => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]));

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/school/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error("Could not create the class — try again");
      setName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the class");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <h1 className="text-xl font-semibold text-gray-900">My Classroom</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a class, add students, then run exams with shared question papers.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New class name"
            className="min-w-[200px] flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm"
          />
          <button
            type="button"
            disabled={busy || !name.trim()}
            onClick={create}
            className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Create class
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <ul className="mt-6 space-y-3">
          {classes.map((c) => (
            <li key={c.id}>
              <Link
                href={`/classroom/${c.id}`}
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-4 hover:border-orange-200"
              >
                <div>
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.students.length} students</p>
                </div>
                <span className="text-sm text-orange-600">Open →</span>
              </Link>
            </li>
          ))}
          {classes.length === 0 && (
            <li className="rounded-2xl border border-dashed border-gray-200 px-5 py-10 text-center text-sm text-gray-500">
              No classes yet. Create one above.
            </li>
          )}
        </ul>
      </div>
    </AppShell>
  );
}
