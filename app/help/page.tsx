"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { FAQ_ITEMS } from "@/lib/demo-data";

export default function HelpPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        <h1 className="text-xl font-semibold text-gray-900">Help</h1>
        <p className="mt-1 text-sm text-gray-500">How to map answers with VedaAI.</p>

        <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-gray-700">
          <li>
            Open <Link href="/exams" className="font-medium text-orange-600">Exams</Link> and upload a question paper + answer sheet.
          </li>
          <li>Wait while pages convert and Gemini extracts questions and answer blocks.</li>
          <li>Review highlights; remap or redraw any mismatched regions.</li>
          <li>Use assistive grading as a draft — confirm marks yourself before sharing.</li>
        </ol>

        <h2 className="mt-8 text-sm font-semibold text-gray-800">FAQ</h2>
        <ul className="mt-3 space-y-3">
          {FAQ_ITEMS.map((item) => (
            <li key={item.q} className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-sm font-medium text-gray-900">{item.q}</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.a}</p>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
