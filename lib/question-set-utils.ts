import type { PageAsset, Question } from "./types";

export function questionSetLabel(opts: {
  title: string;
  questionCount: number;
  createdAt: string;
}): string {
  const date = new Date(opts.createdAt).toLocaleDateString();
  return `${opts.title} · ${opts.questionCount}q · ${date}`;
}

export function canSkipQuestionExtract(opts: {
  questionSetId?: string;
  questions?: Question[];
  questionPages?: PageAsset[];
}): boolean {
  return Boolean(
    opts.questionSetId && opts.questions?.length && opts.questionPages?.length
  );
}
