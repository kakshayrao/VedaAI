export type Question = {
  id: string;
  number: string;
  part?: string;
  text: string;
  marks?: number;
  page: number;
  order: number;
};

export type AnswerRegion = {
  page: number;
  box: [number, number, number, number]; // [ymin,xmin,ymax,xmax] 0–1000
  polygon?: [number, number][];
  kind: "label" | "body";
};

export type ExtractedAnswerBlock = {
  id: string;
  page: number;
  label?: string;
  labelPresent: boolean;
  continuationOf?: string;
  isContinuation: boolean;
  detection: "answer" | "possible_answer" | "noise";
  regions: AnswerRegion[];
  text: string;
  extractionConfidence: number;
};

export type AnswerMappingStatus =
  | "matched"
  | "unmatched"
  | "unlabelled"
  | "ambiguous";

export type StudentAnswer = {
  id: string;
  sourceBlockIds: string[];
  detectedLabel?: string;
  text: string;
  regions: AnswerRegion[];
  extractionConfidence: number;
  mapping: {
    questionId?: string;
    status: AnswerMappingStatus;
    confidence: number;
    candidates?: string[];
  };
};

export type PageAsset = {
  page: number;
  url: string;
  width: number;
  height: number;
  originalWidth?: number;
  originalHeight?: number;
};

export type JobStatus =
  | "uploading"
  | "converting"
  | "extracting_questions"
  | "extracting_answers"
  | "mapping"
  | "ready"
  | "grading"
  | "error";

export type GradingResult = {
  score?: number;
  maxScore?: number;
  verdict: "correct" | "partial" | "incorrect";
  feedback: string;
};

export type AnalysisResult = {
  questions: Question[];
  answers: StudentAnswer[];
  questionPages: PageAsset[];
  answerPages: PageAsset[];
  summary: {
    answered: number;
    unanswered: number;
    unmatched: number;
    unlabelled: number;
    ambiguous: number;
  };
  grading?: Record<string, GradingResult>;
  gradingSummary?: string;
  gradingStatus?: "pending" | "done" | "skipped" | "error";
};

/** Partial extract progress so a mid-run Gemini failure can resume. */
export type JobCheckpoint = {
  questionPages: PageAsset[];
  answerPages: PageAsset[];
  rawQuestions: Array<{
    number: string;
    part?: string | null;
    text: string;
    marks?: number | null;
    page: number;
  }>;
  rawBlocks: ExtractedAnswerBlock[];
  /** Last successfully extracted question page (0 = none). */
  lastQuestionPage: number;
  /** Last successfully extracted answer page (0 = none). */
  lastAnswerPage: number;
};

/** Saved question paper so later jobs can skip Q extraction. */
export type QuestionSet = {
  id: string;
  title: string;
  createdAt: string;
  questions: Question[];
  questionPages: PageAsset[];
  sourceJobId?: string;
};

export type QuestionSetSummary = {
  id: string;
  title: string;
  createdAt: string;
  questionCount: number;
  pageCount: number;
};

export type JobState = {
  id: string;
  status: JobStatus;
  progress: number;
  message?: string;
  result?: AnalysisResult;
  error?: string;
  /** When true, POST /api/jobs/[id]/resume can continue from checkpoint. */
  resumable?: boolean;
  checkpoint?: JobCheckpoint;
  createdAt: string;
  questionUrl?: string;
  answerUrl?: string;
  questionName?: string;
  answerName?: string;
  /** Reuse a saved QuestionSet (skip question PDF + Q extraction). */
  questionSetId?: string;
};

export type JobSummary = {
  id: string;
  status: JobStatus;
  createdAt: string;
  questionName?: string;
  answerName?: string;
  message?: string;
  progress: number;
  summary?: AnalysisResult["summary"];
};

/** Local classroom → exam → per-student submission model (tmp/school). */
export type Student = {
  id: string;
  name: string;
  rollNo?: string;
};

export type Classroom = {
  id: string;
  name: string;
  students: Student[];
};

export type ExamStatus = "draft" | "active" | "closed";

export type Exam = {
  id: string;
  classroomId: string;
  title: string;
  questionSetId?: string;
  status: ExamStatus;
  createdAt: string;
};

export type SubmissionStatus = "missing" | "processing" | "ready" | "error";

export type ExamSubmission = {
  id: string;
  examId: string;
  studentId: string;
  jobId?: string;
  status: SubmissionStatus;
  scores?: {
    total?: number;
    max?: number;
    unanswered?: number;
  };
};
