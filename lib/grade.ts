import { generateJsonText } from "./gemini";
import { gradingPrompt } from "./prompts";
import { jobKey, storeJson } from "./blob";
import { getJob, saveJob } from "./jobs";
import { displayQuestionLabel } from "./questions/postprocess";
import type { AnalysisResult, GradingResult } from "./types";

export async function gradeAnswers(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job?.result) return;

  const result = { ...job.result, gradingStatus: "pending" as const };
  await saveJob({ ...job, status: "grading", result, message: "Grading answers…" });

  const grading: Record<string, GradingResult> = {};
  const matched = result.answers.filter(
    (a) => a.mapping.status === "matched" && a.mapping.questionId
  );

  for (const ans of matched) {
    const q = result.questions.find((x) => x.id === ans.mapping.questionId);
    if (!q) continue;
    try {
      const g = await generateJsonText<GradingResult>(
        gradingPrompt(q.text, q.marks, ans.text)
      );
      grading[q.id] = {
        score: g.score,
        maxScore: g.maxScore ?? q.marks,
        verdict: g.verdict,
        feedback: g.feedback,
      };
    } catch {
      grading[q.id] = {
        maxScore: q.marks,
        verdict: "partial",
        feedback: "Grading unavailable for this answer.",
      };
    }
  }

  const labels = matched.slice(0, 5).map((a) => {
    const q = result.questions.find((x) => x.id === a.mapping.questionId);
    return q ? displayQuestionLabel(q) : a.id;
  });

  // Re-read the job: the teacher may have remapped answers or redrawn regions
  // while grading ran, and saving the stale copy would silently undo that.
  const latest = (await getJob(jobId)) ?? job;
  const next: AnalysisResult = {
    ...(latest.result ?? result),
    grading,
    gradingStatus: "done",
    gradingSummary: Object.keys(grading).length
      ? `Graded ${Object.keys(grading).length} answer(s)${labels.length ? `: ${labels.join(", ")}` : ""}.`
      : "No matched answers to grade.",
  };

  await storeJson(jobKey(jobId, "result.json"), next);
  await saveJob({
    ...latest,
    status: "ready",
    progress: 100,
    message: "Ready",
    result: next,
  });
}
