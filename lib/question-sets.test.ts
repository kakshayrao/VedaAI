import { describe, expect, it } from "vitest";
import { canSkipQuestionExtract, questionSetLabel } from "./question-set-utils";

describe("question-set helpers", () => {
  it("formats list label", () => {
    const s = questionSetLabel({
      title: "Midterm.pdf",
      questionCount: 12,
      createdAt: "2026-08-26T00:00:00.000Z",
    });
    expect(s).toContain("Midterm.pdf");
    expect(s).toContain("12q");
  });

  it("canSkipQuestionExtract requires set + questions + pages", () => {
    expect(canSkipQuestionExtract({})).toBe(false);
    expect(
      canSkipQuestionExtract({
        questionSetId: "x",
        questions: [{ id: "1", number: "1", text: "t", page: 1, order: 1 }],
        questionPages: [{ page: 1, url: "/x", width: 1, height: 1 }],
      })
    ).toBe(true);
  });
});
