"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

type ToolId = "mapping" | "generator" | "rubric" | "feedback";

type GenQ = { number: string; text: string; marks?: number };

export default function ToolkitPage() {
  const [tool, setTool] = useState<ToolId | null>(null);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <h1 className="text-xl font-semibold text-gray-900">AI Teacher&apos;s Toolkit</h1>
        <p className="mt-1 text-sm text-gray-500">Practical helpers for mapping, drafting, and feedback.</p>

        {!tool && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <ToolCard
              title="Answer Mapping"
              desc="Upload question paper + answer sheet and map responses."
              onClick={() => setTool("mapping")}
            />
            <ToolCard
              title="Question Generator"
              desc="Draft exam questions for a topic (Gemini when keyed)."
              onClick={() => setTool("generator")}
            />
            <ToolCard
              title="Rubric Helper"
              desc="Turn marks + criteria into a clear marking rubric."
              onClick={() => setTool("rubric")}
            />
            <ToolCard
              title="Feedback Rewriter"
              desc="Rewrite teacher comments to be clearer and kinder."
              onClick={() => setTool("feedback")}
            />
          </div>
        )}

        {tool === "mapping" && (
          <Panel onBack={() => setTool(null)} title="Answer Mapping">
            <p className="text-sm text-gray-600">
              Jump into the Exams flow to upload papers and review AI mapping.
            </p>
            <Link
              href="/exams"
              className="mt-4 inline-flex rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white"
            >
              Open Exams →
            </Link>
          </Panel>
        )}

        {tool === "generator" && (
          <Panel onBack={() => setTool(null)} title="Question Generator">
            <QuestionGenerator />
          </Panel>
        )}

        {tool === "rubric" && (
          <Panel onBack={() => setTool(null)} title="Rubric Helper">
            <RubricHelper />
          </Panel>
        )}

        {tool === "feedback" && (
          <Panel onBack={() => setTool(null)} title="Feedback Rewriter">
            <FeedbackRewriter />
          </Panel>
        )}
      </div>
    </AppShell>
  );
}

function ToolCard({ title, desc, onClick }: { title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-gray-200 bg-white px-5 py-5 text-left hover:border-orange-200"
    >
      <p className="font-medium text-gray-900">{title}</p>
      <p className="mt-1 text-xs text-gray-500">{desc}</p>
    </button>
  );
}

function Panel({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
      <button type="button" onClick={onBack} className="text-xs font-medium text-orange-600">
        ← Toolkit
      </button>
      <h2 className="mt-2 text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function QuestionGenerator() {
  const [subject, setSubject] = useState("Science");
  const [topic, setTopic] = useState("Life Processes");
  const [classLevel, setClassLevel] = useState("Class 10");
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [questions, setQuestions] = useState<GenQ[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/toolkit/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, topic, classLevel, count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setQuestions(data.questions || []);
      setSource(data.source);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Class" value={classLevel} onChange={setClassLevel} />
        <Field label="Subject" value={subject} onChange={setSubject} />
        <Field label="Topic" value={topic} onChange={setTopic} />
        <label className="block text-xs text-gray-500">
          Count
          <input
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={generate}
        className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "Generating…" : "Generate questions"}
      </button>
      {source && (
        <p className="text-xs text-gray-400">
          Source: {source === "gemini" ? "Gemini" : "Demo (no API key)"}
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ol className="space-y-2">
        {questions.map((q) => (
          <li key={q.number} className="rounded-xl bg-gray-50 px-3 py-2 text-sm">
            <span className="font-medium">Q{q.number}.</span> {q.text}
            {q.marks != null && <span className="text-gray-400"> ({q.marks}m)</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function RubricHelper() {
  const [criteria, setCriteria] = useState("Concept clarity, Diagram accuracy, Keywords, Presentation");
  const [maxMarks, setMaxMarks] = useState(10);
  const [out, setOut] = useState("");

  const build = () => {
    const parts = criteria
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const each = Math.max(1, Math.floor(maxMarks / Math.max(parts.length, 1)));
    const lines = parts.map(
      (p, i) =>
        `${i + 1}. ${p} — ${i === parts.length - 1 ? maxMarks - each * (parts.length - 1) : each} marks\n   Full: meets expectation. Partial: incomplete. Zero: missing.`
    );
    setOut(`Marking rubric (total ${maxMarks})\n\n${lines.join("\n\n")}`);
  };

  return (
    <div className="space-y-3">
      <Field label="Criteria (comma-separated)" value={criteria} onChange={setCriteria} />
      <label className="block text-xs text-gray-500">
        Max marks
        <input
          type="number"
          min={1}
          max={100}
          value={maxMarks}
          onChange={(e) => setMaxMarks(Number(e.target.value))}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
        />
      </label>
      <button type="button" onClick={build} className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white">
        Build rubric
      </button>
      {out && (
        <pre className="whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-xs text-gray-700">{out}</pre>
      )}
    </div>
  );
}

function FeedbackRewriter() {
  const [input, setInput] = useState("Incomplete answer. Diagram missing. Revise chapter.");
  const [out, setOut] = useState("");

  const rewrite = () => {
    const soft = input
      .replace(/incomplete/gi, "could be more complete")
      .replace(/missing/gi, "not yet included")
      .replace(/wrong/gi, "needs correction")
      .replace(/poor/gi, "can be strengthened");
    setOut(
      `You've made a start — thank you. ${soft} Next step: add the missing piece and revisit the key idea once more. Happy to review again.`
    );
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs text-gray-500">
        Draft feedback
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
        />
      </label>
      <button type="button" onClick={rewrite} className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white">
        Rewrite
      </button>
      {out && <p className="rounded-xl bg-orange-50 px-3 py-3 text-sm text-gray-800">{out}</p>}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs text-gray-500">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-300"
      />
    </label>
  );
}
