import { readdir } from "fs/promises";
import path from "path";
import { list } from "@vercel/blob";
import { isLocalStorage, readJson, storeJson } from "./blob";
import type { PageAsset, Question, QuestionSet, QuestionSetSummary } from "./types";

const LOCAL_ROOT = path.join(process.cwd(), "tmp", "question-sets");

function questionSetKey(id: string, name = "set.json") {
  return `question-sets/${id}/${name}`;
}

export async function getQuestionSet(id: string): Promise<QuestionSet | null> {
  return readJson<QuestionSet>(questionSetKey(id));
}

async function saveQuestionSet(set: QuestionSet): Promise<QuestionSet> {
  await storeJson(questionSetKey(set.id), set);
  return set;
}

/** Persist extracted questions for reuse on later answer sheets. */
export async function saveQuestionSetFromJob(opts: {
  jobId: string;
  title: string;
  questions: Question[];
  questionPages: PageAsset[];
}): Promise<QuestionSet> {
  const set: QuestionSet = {
    id: crypto.randomUUID(),
    title: opts.title || "Question paper",
    createdAt: new Date().toISOString(),
    questions: opts.questions,
    questionPages: opts.questionPages,
    sourceJobId: opts.jobId,
  };
  return saveQuestionSet(set);
}

async function listIds(): Promise<string[]> {
  if (isLocalStorage()) {
    try {
      const entries = await readdir(LOCAL_ROOT, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return [];
    }
  }
  // ponytail: prefix scan; fine until volume is large
  const { blobs } = await list({ prefix: "question-sets/", limit: 500 });
  const ids = new Set<string>();
  for (const b of blobs) {
    const m = b.pathname.match(/^question-sets\/([^/]+)\/set\.json$/);
    if (m) ids.add(m[1]);
  }
  return [...ids];
}

export async function listQuestionSets(): Promise<QuestionSetSummary[]> {
  const ids = await listIds();
  const sets = await Promise.all(ids.map((id) => getQuestionSet(id)));
  return sets
    .filter((s): s is QuestionSet => !!s)
    .map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
      questionCount: s.questions.length,
      pageCount: s.questionPages.length,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
