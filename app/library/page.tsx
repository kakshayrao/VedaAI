"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import type { LibraryItem } from "@/lib/demo-data";
import { addLibraryItem, getLibrary } from "@/lib/local-store";

const KIND_LABEL = {
  question_paper: "Question paper",
  answer_sheet: "Answer sheet",
  material: "Material",
} as const;

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [tag, setTag] = useState<string>("all");

  useEffect(() => {
    setItems(getLibrary());
  }, []);

  const tags = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => i.tags.forEach((t) => s.add(t)));
    return ["all", ...Array.from(s).sort()];
  }, [items]);

  const filtered = tag === "all" ? items : items.filter((i) => i.tags.includes(tag));

  const onUpload = (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    const kind: LibraryItem["kind"] = file.name.toLowerCase().includes("answer")
      ? "answer_sheet"
      : file.name.toLowerCase().match(/rubric|material|notes/)
        ? "material"
        : "question_paper";
    const item: LibraryItem = {
      id: crypto.randomUUID(),
      name: file.name,
      kind,
      tags: ["Uploaded", kind === "question_paper" ? "Question" : kind === "answer_sheet" ? "Answers" : "Material"],
      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      addedAt: new Date().toISOString().slice(0, 10),
    };
    setItems(addLibraryItem(item));
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">My Library</h1>
            <p className="mt-1 text-sm text-gray-500">Question papers, answer sheets, and materials.</p>
          </div>
          <label className="cursor-pointer rounded-full bg-black px-5 py-2 text-sm font-medium text-white">
            Upload file
            <input
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.docx"
              onChange={(e) => onUpload(e.target.files)}
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                tag === t ? "bg-black text-white" : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {t === "all" ? "All" : t}
            </button>
          ))}
        </div>

        <ul className="mt-6 space-y-2">
          {filtered.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">
                  {KIND_LABEL[item.kind]} · {item.size} · {item.addedAt}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {item.tags.map((t) => (
                    <span key={t} className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] text-orange-700">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-400">
              No files for this filter.
            </li>
          )}
        </ul>
      </div>
    </AppShell>
  );
}
