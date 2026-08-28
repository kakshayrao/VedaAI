"use client";

import { AppShell } from "@/components/AppShell";
import { ExamsFlow } from "@/components/ExamsFlow";

export default function ExamsPage() {
  return (
    <AppShell>
      <ExamsFlow showPastJobs />
    </AppShell>
  );
}
