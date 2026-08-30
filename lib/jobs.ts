import { readdir, readFile } from "fs/promises";
import path from "path";
import { list } from "@vercel/blob";
import { isLocalStorage, jobKey, readJson, storeJson } from "./blob";
import type { JobState, JobSummary } from "./types";

const LOCAL_ROOT = path.join(process.cwd(), "tmp", "jobs");

export async function getJob(jobId: string): Promise<JobState | null> {
  const job = await readJson<JobState>(jobKey(jobId, "job.json"));
  if (job) return job;

  try {
    const raw = await readFile(path.join(LOCAL_ROOT, jobId, "job.json"), "utf8");
    return JSON.parse(raw) as JobState;
  } catch {
    return null;
  }
}

export async function saveJob(job: JobState): Promise<JobState> {
  await storeJson(jobKey(job.id, "job.json"), job);
  return job;
}

async function listJobIds(): Promise<string[]> {
  const localIds = new Set<string>();
  try {
    const entries = await readdir(LOCAL_ROOT, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) localIds.add(entry.name);
    }
  } catch {
    // local jobs are optional; some deployments only use Blob
  }

  if (isLocalStorage()) return [...localIds];

  // On Vercel, tmp/ is not a durable store; do not trust it for job lookup.
  const { blobs } = await list({ prefix: "", limit: 500 });
  const ids = new Set<string>(localIds);
  for (const b of blobs) {
    const m = b.pathname.match(/^([^/]+)\/job\.json$/);
    if (m) ids.add(m[1]);
  }
  return [...ids];
}

export async function listJobs(): Promise<JobSummary[]> {
  const ids = await listJobIds();
  const jobs = await Promise.all(ids.map((id) => getJob(id)));
  return jobs
    .filter((j): j is JobState => !!j)
    .map((j) => ({
      id: j.id,
      status: j.status,
      createdAt: j.createdAt,
      questionName: j.questionName,
      answerName: j.answerName,
      message: j.message,
      progress: j.progress,
      summary: j.result?.summary,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
