import { describe, expect, it } from "vitest";
import { submissionPatchFromJob } from "./school";

describe("submissionPatchFromJob", () => {
  it("maps job status to submission status", () => {
    expect(submissionPatchFromJob({ status: "extracting_answers" }).status).toBe("processing");
    expect(submissionPatchFromJob({ status: "ready" }).status).toBe("ready");
    expect(submissionPatchFromJob({ status: "grading" }).status).toBe("ready");
    expect(submissionPatchFromJob({ status: "error" }).status).toBe("error");
  });

  it("sums grading scores and copies unanswered", () => {
    const patch = submissionPatchFromJob({
      status: "ready",
      result: {
        summary: { unanswered: 2 },
        grading: {
          a: { score: 3, maxScore: 5 },
          b: { score: 1, maxScore: 2 },
        },
      },
    });
    expect(patch.scores).toEqual({ total: 4, max: 7, unanswered: 2 });
  });
});
