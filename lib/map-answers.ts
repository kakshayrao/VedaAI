import type { Question, StudentAnswer, AnswerMappingStatus } from "./types";
import { normalizeLabel, parseLabel, questionKey } from "./normalize-label";

const TIER = {
  exact: 1.0,
  format: 0.95,
  fuzzy: 0.8,
  contextual: 0.6,
} as const;

const MATCH_THRESHOLD = 0.8;

function variants(raw: string): string[] {
  const n = normalizeLabel(raw);
  const parsed = parseLabel(raw);
  const out = new Set<string>([n]);
  if (parsed) {
    out.add(questionKey(parsed));
    if (parsed.part) {
      out.add(`${parsed.number}${parsed.part}`);
      out.add(`${parsed.number}(${parsed.part})`);
      out.add(`q${parsed.number}${parsed.part}`);
      out.add(`ans${parsed.number}${parsed.part}`);
      out.add(`${parsed.number}-${parsed.part}`);
    } else {
      out.add(parsed.number);
      out.add(`q${parsed.number}`);
    }
  }
  return [...out].map(normalizeLabel);
}

function scoreLabelToQuestion(label: string, q: Question): number {
  const qk = questionKey(q);
  const labs = variants(label);
  if (labs.includes(qk) || labs.includes(normalizeLabel(q.part ? `${q.number}(${q.part})` : q.number))) {
    // Plain "11b" / "11" → exact; Q/Ans/punctuation wrappers → format variant
    if (/^\s*\d+\s*[a-z]?\s*$/i.test(label)) return TIER.exact;
    return TIER.format;
  }

  const lp = parseLabel(label);
  if (!lp) return 0;
  if (lp.number === q.number) {
    if (!lp.part && !q.part) return TIER.fuzzy;
    if (lp.part && q.part && lp.part === q.part) return TIER.fuzzy;
    if (lp.part && q.part && lp.part !== q.part) return TIER.contextual * 0.5; // wrong part
    if (!lp.part && q.part) return TIER.contextual; // number only vs parted
  }
  return 0;
}

/** Statuses a teacher should look at before trusting the mapping. */
export function needsReviewStatus(status: AnswerMappingStatus | string): boolean {
  return status === "unmatched" || status === "unlabelled" || status === "ambiguous";
}

/**
 * Deterministic hierarchical mapping.
 * Mapping confidence is independent of extractionConfidence.
 * Never force low-confidence maps onto matched.
 */
export function mapAnswers(questions: Question[], answers: StudentAnswer[]): StudentAnswer[] {
  return answers.map((ans) => {
    const label = ans.detectedLabel?.trim();
    if (!label) {
      return {
        ...ans,
        mapping: { status: "unlabelled" as AnswerMappingStatus, confidence: 0 },
      };
    }

    const scored = questions
      .map((q) => ({ q, score: scoreLabelToQuestion(label, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    if (!scored.length) {
      return {
        ...ans,
        mapping: { status: "unmatched", confidence: 0 },
      };
    }

    const best = scored[0];
    const candidates = scored.slice(0, 3).map((s) => s.q.id);

    // Ambiguous if top two close
    if (scored.length > 1 && scored[0].score - scored[1].score < 0.1 && scored[0].score < TIER.exact) {
      return {
        ...ans,
        mapping: {
          status: "ambiguous",
          confidence: Math.min(best.score, TIER.contextual),
          questionId: best.q.id,
          candidates,
        },
      };
    }

    if (best.score >= MATCH_THRESHOLD) {
      return {
        ...ans,
        mapping: {
          status: "matched",
          confidence: best.score,
          questionId: best.q.id,
          candidates,
        },
      };
    }

    if (best.score >= TIER.contextual) {
      return {
        ...ans,
        mapping: {
          status: "ambiguous",
          confidence: best.score,
          questionId: best.q.id,
          candidates,
        },
      };
    }

    return {
      ...ans,
      mapping: { status: "unmatched", confidence: best.score, candidates },
    };
  });
}

export function buildSummary(questions: Question[], answers: StudentAnswer[]) {
  const matchedQ = new Set(
    answers.filter((a) => a.mapping.status === "matched" && a.mapping.questionId).map((a) => a.mapping.questionId!)
  );
  return {
    answered: matchedQ.size,
    unanswered: Math.max(0, questions.length - matchedQ.size),
    unmatched: answers.filter((a) => a.mapping.status === "unmatched").length,
    unlabelled: answers.filter((a) => a.mapping.status === "unlabelled").length,
    ambiguous: answers.filter((a) => a.mapping.status === "ambiguous").length,
  };
}

/** Tiny self-check helpers exported for tests */
export const _test = { normalizeLabel, scoreLabelToQuestion, variants, TIER, MATCH_THRESHOLD };
