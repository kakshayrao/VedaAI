import { z } from "zod";
import { generateJsonFromImages } from "../gemini";
import { answerPagesPrompt } from "../prompts";
import type { ExtractedAnswerBlock, AnswerRegion } from "../types";

const BoxSchema = z
  .array(z.number())
  .min(4)
  .transform((a) => [a[0], a[1], a[2], a[3]] as [number, number, number, number]);

const RegionSchema = z.object({
  kind: z.enum(["label", "body"]).default("body"),
  box: BoxSchema,
  polygon: z
    .array(z.tuple([z.number(), z.number()]))
    .optional()
    .nullable(),
});

const BlockSchema = z.object({
  page: z.number().optional(),
  id: z.string().optional(),
  label: z.string().optional().nullable(),
  labelPresent: z.boolean().optional(),
  continuationOf: z.string().optional().nullable(),
  isContinuation: z.boolean().optional(),
  detection: z.enum(["answer", "possible_answer", "noise"]).default("answer"),
  regions: z.array(RegionSchema).default([]),
  text: z.string().default(""),
  extractionConfidence: z.number().min(0).max(1).default(0.7),
});

const PageSchema = z.object({
  answer_blocks: z.array(BlockSchema).default([]),
});

function clampBox(box: [number, number, number, number]): [number, number, number, number] {
  return box.map((v) => Math.max(0, Math.min(1000, v))) as [number, number, number, number];
}

function normalizeAnswerBlocks(
  blocks: z.infer<typeof BlockSchema>[],
  pages: number[]
): ExtractedAnswerBlock[] {
  const fallback = pages[0] ?? 1;
  return blocks.map((b, i) => {
    const page = b.page != null && pages.includes(b.page) ? b.page : fallback;
    const id = b.id || `p${page}-b${i + 1}`;
    const regions: AnswerRegion[] = (
      b.regions.length
        ? b.regions
        : [
            {
              kind: "body" as const,
              box: [0, 0, 1000, 1000] as [number, number, number, number],
              polygon: null,
            },
          ]
    ).map((r) => ({
      page,
      kind: r.kind,
      box: clampBox(r.box),
      polygon: r.polygon ?? undefined,
    }));

    if (!regions.some((r) => r.kind === "body") && regions.length) {
      regions[0].kind = "body";
    }

    return {
      id,
      page,
      label: b.label || undefined,
      labelPresent: b.labelPresent ?? Boolean(b.label),
      continuationOf: b.continuationOf || undefined,
      isContinuation: b.isContinuation ?? false,
      detection: b.detection,
      regions,
      text: b.text.trim(),
      extractionConfidence: b.extractionConfidence,
    };
  });
}

export async function extractAnswerBlocksFromPages(
  images: { bytes: Buffer; page: number }[]
): Promise<ExtractedAnswerBlock[]> {
  if (!images.length) return [];
  const pages = images.map((i) => i.page);
  const raw = await generateJsonFromImages<unknown>({
    prompt: answerPagesPrompt(pages),
    images: images.map((i) => ({
      bytes: i.bytes,
      label: `Page ${i.page}`,
    })),
  });
  const parsed = PageSchema.safeParse(raw);
  if (!parsed.success) return [];
  return normalizeAnswerBlocks(parsed.data.answer_blocks, pages);
}
