import type { ExtractedAnswerBlock, StudentAnswer, AnswerRegion } from "../types";

/**
 * Multi-signal merge across pages.
 * 1. continuationOf → append
 * 2. labelPresent + new label → new answer
 * 3. isContinuation + no label + open prior → append
 * 4. top-of-page unlabeled after incomplete prior → soft append
 * 5. drop noise; quarantine weak possible_answer
 */
export function mergeAnswerBlocks(blocks: ExtractedAnswerBlock[]): StudentAnswer[] {
  const sorted = [...blocks].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    const ay = a.regions[0]?.box[0] ?? 0;
    const by = b.regions[0]?.box[0] ?? 0;
    return ay - by;
  });

  const byId = new Map(sorted.map((b) => [b.id, b]));
  const answers: StudentAnswer[] = [];
  const consumed = new Set<string>();

  function startAnswer(block: ExtractedAnswerBlock): StudentAnswer {
    return {
      id: `answer-${answers.length + 1}`,
      sourceBlockIds: [block.id],
      detectedLabel: block.labelPresent ? block.label : undefined,
      text: block.text,
      regions: [...block.regions],
      extractionConfidence: block.extractionConfidence,
      mapping: { status: "unlabelled", confidence: 0 },
    };
  }

  function append(ans: StudentAnswer, block: ExtractedAnswerBlock) {
    ans.sourceBlockIds.push(block.id);
    if (block.text) ans.text = `${ans.text}\n${block.text}`.trim();
    ans.regions.push(...block.regions);
    ans.extractionConfidence = Math.min(ans.extractionConfidence, block.extractionConfidence);
    if (!ans.detectedLabel && block.labelPresent && block.label) {
      ans.detectedLabel = block.label;
    }
  }

  function looksIncomplete(ans: StudentAnswer): boolean {
    const t = ans.text.trim();
    return t.length < 40 || /[,;:\-–—]$/.test(t) || /\b(and|or|the|to|of|in)$/i.test(t);
  }

  function topOfPage(block: ExtractedAnswerBlock): boolean {
    const y = block.regions.find((r) => r.kind === "body")?.box[0] ?? block.regions[0]?.box[0] ?? 500;
    return y < 200;
  }

  for (const block of sorted) {
    if (consumed.has(block.id)) continue;

    if (block.detection === "noise") {
      consumed.add(block.id);
      continue;
    }

    // Quarantine weak possibles without label/continuation
    if (
      block.detection === "possible_answer" &&
      !block.labelPresent &&
      !block.continuationOf &&
      !block.isContinuation
    ) {
      consumed.add(block.id);
      continue;
    }

    // 1. Explicit continuationOf
    if (block.continuationOf) {
      const target = answers.find((a) => a.sourceBlockIds.includes(block.continuationOf!));
      if (target) {
        append(target, block);
        consumed.add(block.id);
        continue;
      }
      // Try resolve via byId chain into existing
      const prior = byId.get(block.continuationOf);
      if (prior) {
        const host = answers.find((a) => a.sourceBlockIds.includes(prior.id));
        if (host) {
          append(host, block);
          consumed.add(block.id);
          continue;
        }
      }
    }

    // 2. New labelled answer
    if (block.labelPresent && block.label) {
      answers.push(startAnswer(block));
      consumed.add(block.id);
      continue;
    }

    // 3. Weak continuation
    const last = answers[answers.length - 1];
    if (block.isContinuation && last && !block.labelPresent) {
      append(last, block);
      consumed.add(block.id);
      continue;
    }

    // 4. Spatial soft append
    if (
      last &&
      !block.labelPresent &&
      topOfPage(block) &&
      looksIncomplete(last) &&
      block.page === (last.regions.at(-1)?.page ?? 0) + 1
    ) {
      append(last, block);
      consumed.add(block.id);
      continue;
    }

    // New unlabelled (only detection answer / strong possible)
    if (block.detection === "answer" || block.labelPresent) {
      answers.push(startAnswer(block));
      consumed.add(block.id);
    } else {
      consumed.add(block.id);
    }
  }

  // Re-id sequentially
  answers.forEach((a, i) => {
    a.id = `answer-${i + 1}`;
  });

  return answers;
}

/** Prefer body regions for UI. */
export function bodyRegions(regions: AnswerRegion[]): AnswerRegion[] {
  const bodies = regions.filter((r) => r.kind === "body");
  return bodies.length ? bodies : regions;
}
