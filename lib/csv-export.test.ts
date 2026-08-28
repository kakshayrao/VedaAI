import { describe, expect, it } from "vitest";
import { stampQuestionPages } from "./questions/extract-page";
import { csvCell, examRosterCsv, rowsToCsv } from "./csv-export";
import type { Question } from "./types";

describe("stampQuestionPages", () => {
  it("keeps valid page and falls back otherwise", () => {
    const out = stampQuestionPages(
      [
        { page: 2, number: "1", text: "a" },
        { number: "2", text: "b" },
        { page: 99, number: "3", text: "c" },
      ],
      [1, 2]
    );
    expect(out.map((q) => q.page)).toEqual([2, 1, 1]);
  });
});

describe("csv-export", () => {
  it("escapes cells and builds roster CSV", () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("a\nb")).toBe('"a\nb"');
    expect(csvCell(null)).toBe("");
    expect(rowsToCsv(["a", "b"], [[1, "x,y"]])).toContain('"x,y"');
    const qs: Question[] = [
      { id: "q-1", number: "1", text: "t", page: 1, order: 1 },
    ];
    const csv = examRosterCsv(qs, [
      {
        rollNo: "01",
        name: "Ada",
        status: "ready",
        totalScore: 2,
        maxScore: 5,
        unanswered: 0,
        perQuestion: { "1": 2 },
      },
    ]);
    expect(csv).toContain("roll,name,status,total_score,max_score,unanswered,score_1");
    expect(csv).toContain("01,Ada,ready,2,5,0,2");
  });
});
