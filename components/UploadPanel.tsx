"use client";

import { useEffect, useRef, useState } from "react";
import type { QuestionSetSummary } from "@/lib/types";
import { questionSetLabel } from "@/lib/question-set-utils";
import { uploadFileError } from "@/lib/client-upload";

export type UploadFile = {
  file: File;
  name: string;
  sizeLabel: string;
};

export type UploadStart =
  | { mode: "new"; question: File; answer: File }
  | { mode: "saved"; questionSetId: string; answer: File };

function formatSize(n: number) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${(n / (1024 * 1024)).toFixed(0)}MB`;
}

function Slot({
  label,
  value,
  onChange,
  onClear,
}: {
  label: string;
  value: UploadFile | null;
  onChange: (f: UploadFile) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const pick = (f: File | undefined) => {
    if (!f) return;
    const err = uploadFileError(f);
    setFileError(err);
    if (!err) onChange({ file: f, name: f.name, sizeLabel: formatSize(f.size) });
  };

  const ext = value ? (value.name.split(".").pop() || "").toUpperCase().slice(0, 4) : "";
  const isPdf = ext === "PDF";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !value && inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && !value && inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        pick(e.dataTransfer.files?.[0]);
      }}
      className="relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white px-4 py-6 transition hover:border-orange-300"
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {value ? (
        <>
          <button
            type="button"
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-700"
            onClick={(e) => {
              e.stopPropagation();
              setFileError(null);
              onClear();
            }}
            aria-label={`Clear ${label}`}
          >
            ×
          </button>
          <div
            className={`mb-2 flex h-12 w-10 items-center justify-center rounded text-xs font-bold text-white ${
              isPdf ? "bg-red-500" : "bg-sky-500"
            }`}
          >
            {ext || "FILE"}
          </div>
          <div className="max-w-full truncate text-sm font-medium text-gray-800">{value.name}</div>
          <div className="text-xs text-gray-500">{value.sizeLabel}</div>
        </>
      ) : (
        <>
          <div className="mb-2 text-3xl text-gray-300">↑</div>
          <div className="text-sm font-medium text-gray-700">{label}</div>
          <div className="mt-1 text-xs text-gray-400">PDF or images · up to 50MB</div>
        </>
      )}
      {fileError && <p className="mt-2 text-xs font-medium text-red-600">{fileError}</p>}
    </div>
  );
}

function HeroIllustration() {
  return (
    <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-100 to-rose-100" />
      <svg viewBox="0 0 120 120" className="relative h-24 w-24">
        <circle cx="60" cy="60" r="48" fill="#FED7AA" />
        <circle cx="60" cy="52" r="18" fill="#FDBA74" />
        <ellipse cx="60" cy="88" rx="22" ry="16" fill="#FB923C" />
        <rect x="70" y="70" width="22" height="16" rx="2" fill="#fff" stroke="#F97316" />
      </svg>
      <span className="absolute -left-2 top-4 text-orange-400">✦</span>
      <span className="absolute -right-1 top-8 text-orange-500">✦</span>
      <span className="absolute bottom-2 left-0 text-rose-400">✦</span>
    </div>
  );
}

export function UploadPanel({
  onStart,
  busy,
}: {
  onStart: (payload: UploadStart) => void;
  busy?: boolean;
}) {
  const [mode, setMode] = useState<"new" | "saved">("new");
  const [question, setQuestion] = useState<UploadFile | null>(null);
  const [answer, setAnswer] = useState<UploadFile | null>(null);
  const [sets, setSets] = useState<QuestionSetSummary[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>("");

  useEffect(() => {
    if (mode !== "saved") return;
    fetch("/api/question-sets")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: QuestionSetSummary[]) => {
        const list = Array.isArray(data) ? data : [];
        setSets(list);
        if (list[0] && !selectedSetId) setSelectedSetId(list[0].id);
      })
      .catch(() => setSets([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load when toggling to saved
  }, [mode]);

  const ready =
    !busy &&
    Boolean(answer) &&
    (mode === "new" ? Boolean(question) : Boolean(selectedSetId));

  const submit = () => {
    if (!answer) return;
    if (mode === "saved" && selectedSetId) {
      onStart({ mode: "saved", questionSetId: selectedSetId, answer: answer.file });
    } else if (mode === "new" && question) {
      onStart({ mode: "new", question: question.file, answer: answer.file });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-10 md:py-14">
      <h1 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
        Upload Question Paper &{" "}
        <span className="text-orange-500">Answer Sheets</span>
      </h1>
      <p className="mt-2 text-center text-gray-500">
        Upload both files, or reuse a saved question paper.
      </p>

      <div className="mt-6 flex rounded-full border border-gray-200 bg-white p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("new")}
          className={`rounded-full px-4 py-1.5 font-medium ${
            mode === "new" ? "bg-gray-950 text-white" : "text-gray-600"
          }`}
        >
          Upload new question paper
        </button>
        <button
          type="button"
          onClick={() => setMode("saved")}
          className={`rounded-full px-4 py-1.5 font-medium ${
            mode === "saved" ? "bg-gray-950 text-white" : "text-gray-600"
          }`}
        >
          Use saved question paper
        </button>
      </div>

      <div className="mt-8">
        <HeroIllustration />
      </div>

      <div className="mt-2 grid w-full gap-4 md:grid-cols-2">
        {mode === "new" ? (
          <Slot
            label="Question Paper"
            value={question}
            onChange={setQuestion}
            onClear={() => setQuestion(null)}
          />
        ) : (
          <div className="flex min-h-[140px] flex-col justify-center rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/40 px-4 py-6">
            <label className="mb-2 text-sm font-medium text-gray-700">Saved question paper</label>
            {sets.length === 0 ? (
              <p className="text-xs text-gray-500">
                None yet — extract a paper once (Upload new), then reuse it here.
              </p>
            ) : (
              <select
                value={selectedSetId}
                onChange={(e) => setSelectedSetId(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
              >
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
            )}
          </div>
        )}
        <Slot
          label="Answer Sheet"
          value={answer}
          onChange={setAnswer}
          onClear={() => setAnswer(null)}
        />
      </div>

      <button
        type="button"
        disabled={!ready}
        onClick={submit}
        className="mt-8 w-full max-w-md rounded-full bg-gray-950 px-8 py-3.5 text-sm font-semibold text-white transition enabled:hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Uploading…" : "Start Mapping →"}
      </button>
      <p className="mt-4 text-center text-xs text-gray-400">
        Saved papers skip question extraction (saves Gemini quota).
      </p>
    </div>
  );
}
