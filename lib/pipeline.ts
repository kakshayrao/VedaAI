import { readBytes, storeFile, storeJson, jobKey } from "./blob";
import { getJob, saveJob } from "./jobs";
import { getQuestionSet, saveQuestionSetFromJob } from "./question-sets";
import { canSkipQuestionExtract } from "./question-set-utils";
import { toPageImages } from "./pdf-to-images";
import { extractQuestionsFromPages } from "./questions/extract-page";
import { postprocessQuestions } from "./questions/postprocess";
import { extractAnswerBlocksFromPages } from "./answers/extract-page";
import { mergeAnswerBlocks } from "./answers/merge-blocks";
import { mapAnswers, buildSummary } from "./map-answers";
import { gradeAnswers } from "./grade";
import {
  answerPageBatch,
  chunkBatch,
  formatPageRange,
  pendingPages,
  questionPageBatch,
} from "./page-batch";
import type { AnalysisResult, JobState, JobCheckpoint, Question } from "./types";

function emptySummary(): AnalysisResult["summary"] {
  return { answered: 0, unanswered: 0, unmatched: 0, unlabelled: 0, ambiguous: 0 };
}

function partialResult(
  cp: JobCheckpoint,
  questions = postprocessQuestions(cp.rawQuestions)
): AnalysisResult {
  // ponytail: remap after each answer page so UI can show answered/not-yet mid-run
  const answers =
    questions.length && cp.rawBlocks.length
      ? mapAnswers(questions, mergeAnswerBlocks(cp.rawBlocks))
      : [];
  return {
    questions,
    answers,
    questionPages: cp.questionPages,
    answerPages: cp.answerPages,
    summary: answers.length ? buildSummary(questions, answers) : emptySummary(),
    gradingStatus: "pending",
  };
}

export async function runPipeline(
  jobId: string,
  opts?: { resume?: boolean }
): Promise<void> {
  const job = await getJob(jobId);
  if (!job?.answerUrl || (!job.questionUrl && !job.questionSetId)) {
    await saveJob({
      id: jobId,
      status: "error",
      progress: 0,
      message: "Missing uploads",
      error: "answerUrl required; also questionUrl or questionSetId",
      createdAt: new Date().toISOString(),
    });
    return;
  }

  let state: JobState = {
    ...job,
    resumable: false,
    error: undefined,
  };

  const persist = async (patch: Partial<JobState>) => {
    state = { ...state, ...patch };
    await saveJob(state);
  };

  try {
    let questionPages = opts?.resume ? state.checkpoint?.questionPages ?? [] : [];
    let answerPages = opts?.resume ? state.checkpoint?.answerPages ?? [] : [];
    let rawQs = opts?.resume ? [...(state.checkpoint?.rawQuestions ?? [])] : [];
    let rawBlocks = opts?.resume ? [...(state.checkpoint?.rawBlocks ?? [])] : [];
    let lastQuestionPage = opts?.resume ? state.checkpoint?.lastQuestionPage ?? 0 : 0;
    let lastAnswerPage = opts?.resume ? state.checkpoint?.lastAnswerPage ?? 0 : 0;
    let reusedQuestions: Question[] | null = null;

    // Load saved Q paper (skip re-extract); also needed on resume after mid-answer fail
    if (job.questionSetId) {
      const set = await getQuestionSet(job.questionSetId);
      if (!set?.questions.length) {
        throw new Error(`Question set ${job.questionSetId} not found or empty`);
      }
      reusedQuestions = set.questions;
      if (!questionPages.length) {
        if (!canSkipQuestionExtract({ questionSetId: job.questionSetId, questions: set.questions, questionPages: set.questionPages })) {
          throw new Error(`Question set ${job.questionSetId} missing pages`);
        }
        questionPages = set.questionPages;
        lastQuestionPage = questionPages.length;
        rawQs = [];
      } else if (!lastQuestionPage) {
        lastQuestionPage = questionPages.length;
      }
    }

    const saveCheckpoint = async (
      status: JobState["status"],
      progress: number,
      message: string,
      questions?: Question[]
    ) => {
      const checkpoint: JobCheckpoint = {
        questionPages,
        answerPages,
        rawQuestions: rawQs,
        rawBlocks,
        lastQuestionPage,
        lastAnswerPage,
      };
      await persist({
        status,
        progress,
        message,
        checkpoint,
        result: partialResult(checkpoint, questions ?? (reusedQuestions || undefined)),
      });
    };

    const needQConvert = !questionPages.length && !job.questionSetId;
    const needAConvert = !answerPages.length;

    if (needQConvert || needAConvert) {
      await persist({ status: "converting", progress: 5, message: "Converting pages…" });

      if (needQConvert && job.questionUrl) {
        const qBuf = await readBytes(job.questionUrl);
        const qPages = await toPageImages(qBuf, job.questionName);
        questionPages = [];
        for (const p of qPages) {
          const url = await storeFile(jobKey(jobId, `q-page-${p.page}.png`), p.buffer, "image/png");
          questionPages.push({
            page: p.page,
            url,
            width: p.width,
            height: p.height,
            originalWidth: p.originalWidth,
            originalHeight: p.originalHeight,
          });
        }
        rawQs = [];
        lastQuestionPage = 0;
      }

      if (needAConvert) {
        const aBuf = await readBytes(job.answerUrl!);
        const aPages = await toPageImages(aBuf, job.answerName);
        answerPages = [];
        for (const p of aPages) {
          const url = await storeFile(jobKey(jobId, `a-page-${p.page}.png`), p.buffer, "image/png");
          answerPages.push({
            page: p.page,
            url,
            width: p.width,
            height: p.height,
            originalWidth: p.originalWidth,
            originalHeight: p.originalHeight,
          });
        }
        rawBlocks = [];
        lastAnswerPage = 0;
      }

      await saveCheckpoint("converting", 15, "Pages ready — starting extraction…");
    }

    if (!reusedQuestions) {
      const qBatch = questionPageBatch();
      const pendingQ = pendingPages(questionPages, lastQuestionPage);
      for (const batch of chunkBatch(pendingQ, qBatch)) {
        const from = batch[0].page;
        const to = batch[batch.length - 1].page;
        const range = formatPageRange(from, to, questionPages.length);
        await persist({
          status: "extracting_questions",
          progress: 20 + Math.round((to / questionPages.length) * 25),
          message: `Extracting questions — ${range}`,
          checkpoint: {
            questionPages,
            answerPages,
            rawQuestions: rawQs,
            rawBlocks,
            lastQuestionPage,
            lastAnswerPage,
          },
        });
        const images = await Promise.all(
          batch.map(async (page) => ({ bytes: await readBytes(page.url), page: page.page }))
        );
        rawQs.push(...(await extractQuestionsFromPages(images)));
        lastQuestionPage = to;
        await saveCheckpoint(
          "extracting_questions",
          20 + Math.round((to / questionPages.length) * 25),
          `Extracted questions through ${range}`
        );
      }
    }

    const questions = reusedQuestions ?? postprocessQuestions(rawQs);

    // Auto-save Q paper once extraction finishes (or reused — skip duplicate)
    if (!job.questionSetId && questions.length && questionPages.length) {
      const saved = await saveQuestionSetFromJob({
        jobId,
        title: job.questionName || "Question paper",
        questions,
        questionPages,
      });
      await persist({ questionSetId: saved.id });
    }

    await saveCheckpoint(
      "extracting_answers",
      48,
      `Question paper done — ${questions.length} questions. Analyzing answer sheet…`,
      questions
    );

    const aBatch = answerPageBatch();
    const pendingA = pendingPages(answerPages, lastAnswerPage);
    for (const batch of chunkBatch(pendingA, aBatch)) {
      const from = batch[0].page;
      const to = batch[batch.length - 1].page;
      const range = formatPageRange(from, to, answerPages.length);
      await persist({
        status: "extracting_answers",
        progress: 50 + Math.round((to / answerPages.length) * 30),
        message: `Analyzing answer sheet — ${range}`,
        checkpoint: {
          questionPages,
          answerPages,
          rawQuestions: rawQs,
          rawBlocks,
          lastQuestionPage,
          lastAnswerPage,
        },
        result: partialResult(
          {
            questionPages,
            answerPages,
            rawQuestions: rawQs,
            rawBlocks,
            lastQuestionPage,
            lastAnswerPage,
          },
          questions
        ),
      });
      const images = await Promise.all(
        batch.map(async (page) => ({ bytes: await readBytes(page.url), page: page.page }))
      );
      rawBlocks.push(...(await extractAnswerBlocksFromPages(images)));
      lastAnswerPage = to;
      await saveCheckpoint(
        "extracting_answers",
        50 + Math.round((to / answerPages.length) * 30),
        `Extracted answers through ${range}`,
        questions
      );
    }

    const merged = mergeAnswerBlocks(rawBlocks);

    await persist({ status: "mapping", progress: 90, message: "Mapping answers…" });

    const answers = mapAnswers(questions, merged);
    const summary = buildSummary(questions, answers);

    const result: AnalysisResult = {
      questions,
      answers,
      questionPages,
      answerPages,
      summary,
      gradingStatus: "pending",
    };

    await storeJson(jobKey(jobId, "result.json"), result);
    await persist({
      status: "ready",
      progress: 100,
      message: "Ready",
      result,
      checkpoint: undefined,
      resumable: false,
      error: undefined,
    });

    void gradeAnswers(jobId).catch(() => undefined);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const hasPages = Boolean(state.checkpoint?.questionPages?.length);
    await saveJob({
      ...state,
      status: "error",
      message: hasPages
        ? `Paused — ${state.message || "extraction interrupted"}. You can resume.`
        : "Failed — no checkpoint. Re-upload to start again.",
      error: msg,
      resumable: hasPages,
    });
  }
}
