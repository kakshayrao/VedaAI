import { z } from "zod";
import { generateJsonFromImages } from "../gemini";
import { questionPagesPrompt } from "../prompts";

const PageQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      page: z.number().optional(),
      number: z.union([z.string(), z.number()]).transform(String),
      part: z.string().optional().nullable(),
      text: z.string(),
      marks: z.number().optional().nullable(),
    })
  ),
});

export type RawPageQuestion = {
  number: string;
  part?: string | null;
  text: string;
  marks?: number | null;
  page: number;
};

/** Stamp missing page from batch fallback (first page / round-robin not used — fixed page). */
export function stampQuestionPages(
  questions: Array<{
    page?: number;
    number: string;
    part?: string | null;
    text: string;
    marks?: number | null;
  }>,
  pages: number[]
): RawPageQuestion[] {
  const fallback = pages[0] ?? 1;
  return questions.map((q) => ({
    number: q.number,
    part: q.part || undefined,
    text: q.text,
    marks: q.marks ?? undefined,
    page: q.page != null && pages.includes(q.page) ? q.page : fallback,
  }));
}

export async function extractQuestionsFromPages(
  images: { bytes: Buffer; page: number }[]
): Promise<RawPageQuestion[]> {
  if (!images.length) return [];
  const pages = images.map((i) => i.page);
  const raw = await generateJsonFromImages<unknown>({
    prompt: questionPagesPrompt(pages),
    images: images.map((i) => ({
      bytes: i.bytes,
      label: `Page ${i.page}`,
    })),
  });
  const parsed = PageQuestionsSchema.safeParse(raw);
  if (!parsed.success) return [];
  return stampQuestionPages(parsed.data.questions, pages);
}
