import { readJson, storeJson } from "./blob";
import { DEMO_CLASSES } from "./demo-data";
import type {
  Classroom,
  Exam,
  ExamSubmission,
  Student,
  SubmissionStatus,
} from "./types";

const CLASSROOMS_KEY = "school/classrooms.json";
const EXAMS_KEY = "school/exams.json";
const SUBMISSIONS_KEY = "school/submissions.json";

function seedClassrooms(): Classroom[] {
  return DEMO_CLASSES.map((c) => ({
    id: c.id,
    name: c.name,
    students: c.students.map((s) => ({
      id: s.id,
      name: s.name,
      rollNo: s.roll,
    })),
  }));
}

async function loadClassrooms(): Promise<Classroom[]> {
  const list = await readJson<Classroom[]>(CLASSROOMS_KEY);
  if (list?.length) return list;
  const seeded = seedClassrooms();
  await storeJson(CLASSROOMS_KEY, seeded);
  return seeded;
}

async function saveClassrooms(list: Classroom[]) {
  await storeJson(CLASSROOMS_KEY, list);
}

async function loadExams(): Promise<Exam[]> {
  return (await readJson<Exam[]>(EXAMS_KEY)) ?? [];
}

async function saveExams(list: Exam[]) {
  await storeJson(EXAMS_KEY, list);
}

async function loadSubmissions(): Promise<ExamSubmission[]> {
  return (await readJson<ExamSubmission[]>(SUBMISSIONS_KEY)) ?? [];
}

async function saveSubmissions(list: ExamSubmission[]) {
  await storeJson(SUBMISSIONS_KEY, list);
}

export async function listClassrooms(): Promise<Classroom[]> {
  return loadClassrooms();
}

export async function getClassroom(id: string): Promise<Classroom | null> {
  const list = await loadClassrooms();
  return list.find((c) => c.id === id) ?? null;
}

export async function createClassroom(name: string): Promise<Classroom> {
  const list = await loadClassrooms();
  const c: Classroom = {
    id: crypto.randomUUID(),
    name: name.trim() || "Untitled class",
    students: [],
  };
  list.unshift(c);
  await saveClassrooms(list);
  return c;
}

export async function updateClassroom(
  id: string,
  patch: Partial<Pick<Classroom, "name" | "students">>
): Promise<Classroom | null> {
  const list = await loadClassrooms();
  const i = list.findIndex((c) => c.id === id);
  if (i < 0) return null;
  list[i] = { ...list[i], ...patch };
  await saveClassrooms(list);
  return list[i];
}

export async function deleteClassroom(id: string): Promise<boolean> {
  const list = await loadClassrooms();
  const next = list.filter((c) => c.id !== id);
  if (next.length === list.length) return false;
  await saveClassrooms(next);
  const exams = await loadExams();
  const keepExamIds = new Set(exams.filter((e) => e.classroomId !== id).map((e) => e.id));
  await saveExams(exams.filter((e) => e.classroomId !== id));
  const subs = await loadSubmissions();
  await saveSubmissions(subs.filter((s) => keepExamIds.has(s.examId)));
  return true;
}

export async function addStudent(
  classroomId: string,
  student: Omit<Student, "id"> & { id?: string }
): Promise<Classroom | null> {
  const cls = await getClassroom(classroomId);
  if (!cls) return null;
  const s: Student = {
    id: student.id || crypto.randomUUID(),
    name: student.name.trim(),
    rollNo: student.rollNo?.trim() || undefined,
  };
  return updateClassroom(classroomId, { students: [...cls.students, s] });
}

export async function removeStudent(
  classroomId: string,
  studentId: string
): Promise<Classroom | null> {
  const cls = await getClassroom(classroomId);
  if (!cls) return null;
  return updateClassroom(classroomId, {
    students: cls.students.filter((s) => s.id !== studentId),
  });
}

export async function listExams(classroomId?: string): Promise<Exam[]> {
  const list = await loadExams();
  return classroomId
    ? list.filter((e) => e.classroomId === classroomId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getExam(id: string): Promise<Exam | null> {
  const list = await loadExams();
  return list.find((e) => e.id === id) ?? null;
}

export async function createExam(opts: {
  classroomId: string;
  title: string;
  questionSetId?: string;
}): Promise<Exam | null> {
  const cls = await getClassroom(opts.classroomId);
  if (!cls) return null;
  const list = await loadExams();
  const exam: Exam = {
    id: crypto.randomUUID(),
    classroomId: opts.classroomId,
    title: opts.title.trim() || "Untitled exam",
    questionSetId: opts.questionSetId,
    status: opts.questionSetId ? "active" : "draft",
    createdAt: new Date().toISOString(),
  };
  list.unshift(exam);
  await saveExams(list);
  // Seed missing submissions for roster
  const subs = await loadSubmissions();
  for (const st of cls.students) {
    subs.push({
      id: crypto.randomUUID(),
      examId: exam.id,
      studentId: st.id,
      status: "missing",
    });
  }
  await saveSubmissions(subs);
  return exam;
}

export async function updateExam(
  id: string,
  patch: Partial<Pick<Exam, "title" | "questionSetId" | "status">>
): Promise<Exam | null> {
  const list = await loadExams();
  const i = list.findIndex((e) => e.id === id);
  if (i < 0) return null;
  list[i] = { ...list[i], ...patch };
  if (patch.questionSetId && list[i].status === "draft") list[i].status = "active";
  await saveExams(list);
  return list[i];
}

export async function listSubmissions(examId: string): Promise<ExamSubmission[]> {
  const list = await loadSubmissions();
  return list.filter((s) => s.examId === examId);
}

export async function upsertSubmission(
  patch: Partial<ExamSubmission> & { examId: string; studentId: string }
): Promise<ExamSubmission> {
  const list = await loadSubmissions();
  const i = list.findIndex(
    (s) => s.examId === patch.examId && s.studentId === patch.studentId
  );
  if (i >= 0) {
    list[i] = { ...list[i], ...patch, id: list[i].id };
    await saveSubmissions(list);
    return list[i];
  }
  const created: ExamSubmission = {
    id: patch.id || crypto.randomUUID(),
    examId: patch.examId,
    studentId: patch.studentId,
    jobId: patch.jobId,
    status: patch.status || "missing",
    scores: patch.scores,
  };
  list.push(created);
  await saveSubmissions(list);
  return created;
}

async function updateSubmission(
  id: string,
  patch: Partial<Pick<ExamSubmission, "jobId" | "status" | "scores">>
): Promise<ExamSubmission | null> {
  const list = await loadSubmissions();
  const i = list.findIndex((s) => s.id === id);
  if (i < 0) return null;
  list[i] = { ...list[i], ...patch };
  await saveSubmissions(list);
  return list[i];
}

type JobLike = {
  status: string;
  result?: {
    summary?: { unanswered: number };
    grading?: Record<string, { score?: number; maxScore?: number }>;
  };
};

/** Pure: derive submission status + scores from a job snapshot. */
export function submissionPatchFromJob(
  job: JobLike
): Pick<ExamSubmission, "status" | "scores"> {
  let status: SubmissionStatus = "processing";
  if (job.status === "ready" || job.status === "grading") status = "ready";
  else if (job.status === "error") status = "error";

  const scores: ExamSubmission["scores"] = {};
  if (job.result?.grading) {
    let total = 0;
    let max = 0;
    for (const g of Object.values(job.result.grading)) {
      if (g.score != null) total += g.score;
      if (g.maxScore != null) max += g.maxScore;
    }
    scores.total = total;
    scores.max = max;
  }
  if (job.result?.summary) scores.unanswered = job.result.summary.unanswered;

  return { status, scores };
}

export async function syncSubmissionFromJob(
  submissionId: string,
  job: JobLike
): Promise<ExamSubmission | null> {
  return updateSubmission(submissionId, submissionPatchFromJob(job));
}
