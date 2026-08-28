import { describe, expect, it } from "vitest";
import { mapAnswers, _test } from "./map-answers";
import type { Question, StudentAnswer } from "./types";

function q(number: string, part?: string): Question {
  return {
    id: `q-${number}${part || ""}`,
    number,
    part,
    text: `Question ${number}${part || ""}`,
    page: 1,
    order: 1,
  };
}

function ans(label: string | undefined, id = "answer-1"): StudentAnswer {
  return {
    id,
    sourceBlockIds: ["p1-b1"],
    detectedLabel: label,
    text: "sample",
    regions: [{ page: 1, box: [0, 0, 100, 100], kind: "body" }],
    extractionConfidence: 0.9,
    mapping: { status: "unlabelled", confidence: 0 },
  };
}

describe("mapAnswers", () => {
  it("exact normalized → matched 1.0", () => {
    const [a] = mapAnswers([q("11", "b")], [ans("11b")]);
    expect(a.mapping.status).toBe("matched");
    expect(a.mapping.confidence).toBe(1);
    expect(a.mapping.questionId).toBe("q-11b");
  });

  it("format variant → matched 0.95", () => {
    const [a] = mapAnswers([q("11", "b")], [ans("Q11(b)")]);
    expect(a.mapping.status).toBe("matched");
    expect(a.mapping.confidence).toBe(0.95);
  });

  it("Ans 11-b variant → matched", () => {
    const [a] = mapAnswers([q("11", "b")], [ans("Ans 11-b")]);
    expect(a.mapping.status).toBe("matched");
    expect(a.mapping.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it("contextual only → ambiguous, never forced matched", () => {
    const [a] = mapAnswers([q("11", "a"), q("11", "b")], [ans("11")]);
    expect(a.mapping.status).toBe("ambiguous");
    expect(a.mapping.confidence).toBeLessThan(0.8);
  });

  it("no label → unlabelled", () => {
    const [a] = mapAnswers([q("1")], [ans(undefined)]);
    expect(a.mapping.status).toBe("unlabelled");
  });

  it("unknown label → unmatched", () => {
    const [a] = mapAnswers([q("1")], [ans("99(z)")]);
    expect(a.mapping.status).toBe("unmatched");
  });

  it("normalizeLabel strips wrappers", () => {
    expect(_test.normalizeLabel("Q. 11 (b)")).toBe("11b");
    expect(_test.normalizeLabel("Ans 11-b")).toBe("11b");
  });
});
