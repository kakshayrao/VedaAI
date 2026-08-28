export type DemoStudent = { id: string; name: string; roll: string };
export type DemoClass = {
  id: string;
  name: string;
  studentCount: number;
  students: DemoStudent[];
};
export type AssignmentStatus = "draft" | "active" | "graded";
export type DemoAssignment = {
  id: string;
  title: string;
  classId: string;
  className: string;
  dueDate: string;
  status: AssignmentStatus;
  submissions: number;
  total: number;
  description: string;
};
export type LibraryItem = {
  id: string;
  name: string;
  kind: "question_paper" | "answer_sheet" | "material";
  tags: string[];
  size: string;
  addedAt: string;
};
export type DemoNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
};

export const DEMO_CLASSES: DemoClass[] = [
  {
    id: "c10-sci-a",
    name: "Class 10 Science A",
    studentCount: 32,
    students: [
      { id: "s1", name: "Aarav Mehta", roll: "01" },
      { id: "s2", name: "Diya Sharma", roll: "02" },
      { id: "s3", name: "Kabir Singh", roll: "03" },
      { id: "s4", name: "Ananya Gupta", roll: "04" },
      { id: "s5", name: "Rohan Verma", roll: "05" },
      { id: "s6", name: "Ishita Nair", roll: "06" },
    ],
  },
  {
    id: "c10-sci-b",
    name: "Class 10 Science B",
    studentCount: 28,
    students: [
      { id: "s7", name: "Vihaan Rao", roll: "01" },
      { id: "s8", name: "Myra Kapoor", roll: "02" },
      { id: "s9", name: "Arjun Das", roll: "03" },
      { id: "s10", name: "Sana Ali", roll: "04" },
    ],
  },
  {
    id: "c9-math-a",
    name: "Class 9 Maths A",
    studentCount: 35,
    students: [
      { id: "s11", name: "Dev Patel", roll: "01" },
      { id: "s12", name: "Kiara Bose", roll: "02" },
      { id: "s13", name: "Yash Malhotra", roll: "03" },
    ],
  },
];

export const DEMO_ASSIGNMENTS: DemoAssignment[] = [
  {
    id: "a1",
    title: "Unit Test — Life Processes",
    classId: "c10-sci-a",
    className: "Class 10 Science A",
    dueDate: "2026-08-28",
    status: "active",
    submissions: 18,
    total: 32,
    description: "Chapter 6 worksheet covering nutrition and respiration.",
  },
  {
    id: "a2",
    title: "Practice Paper — Quadratic Equations",
    classId: "c9-math-a",
    className: "Class 9 Maths A",
    dueDate: "2026-08-30",
    status: "draft",
    submissions: 0,
    total: 35,
    description: "Draft set for next week's practice session.",
  },
  {
    id: "a3",
    title: "Mid-term — Acids, Bases & Salts",
    classId: "c10-sci-b",
    className: "Class 10 Science B",
    dueDate: "2026-08-20",
    status: "graded",
    submissions: 28,
    total: 28,
    description: "Full mid-term paper. Mapping + grading complete.",
  },
];

export const DEMO_LIBRARY: LibraryItem[] = [
  {
    id: "l1",
    name: "Class_10_Science_Unit_Test.pdf",
    kind: "question_paper",
    tags: ["Class 10", "Science", "Unit Test"],
    size: "2.1 MB",
    addedAt: "2026-08-22",
  },
  {
    id: "l2",
    name: "student_1_answer_sheet.pdf",
    kind: "answer_sheet",
    tags: ["Class 10", "Science"],
    size: "8.0 MB",
    addedAt: "2026-08-22",
  },
  {
    id: "l3",
    name: "Rubric_Life_Processes.docx",
    kind: "material",
    tags: ["Rubric", "Science"],
    size: "120 KB",
    addedAt: "2026-08-18",
  },
  {
    id: "l4",
    name: "Class_9_Maths_Practice.pdf",
    kind: "question_paper",
    tags: ["Class 9", "Maths"],
    size: "1.4 MB",
    addedAt: "2026-08-15",
  },
];

export const DEMO_NOTIFICATIONS: DemoNotification[] = [
  {
    id: "n1",
    title: "Job ready",
    body: "Answer mapping finished for Class 10 Science Unit Test.",
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    read: false,
    href: "/exams",
  },
  {
    id: "n2",
    title: "Grading complete",
    body: "Assistive grading summary is available for Mid-term — Acids, Bases & Salts.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    read: false,
    href: "/assignments/a3",
  },
  {
    id: "n3",
    title: "Assignment reminder",
    body: "Unit Test — Life Processes is due in 2 days.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    read: true,
    href: "/assignments/a1",
  },
];

export const FAQ_ITEMS = [
  {
    q: "How does answer mapping work?",
    a: "Upload a question paper and a student answer sheet. Gemini extracts questions and answer blocks; TypeScript maps labels deterministically and highlights regions for review.",
  },
  {
    q: "What file types are supported?",
    a: "PDF and common image formats (PNG/JPG). Soft cap ~20 pages per document.",
  },
  {
    q: "Can I correct a wrong mapping?",
    a: "Yes. Open Review on an answer, remap it to another question, or redraw the region on the sheet.",
  },
  {
    q: "Is grading final?",
    a: "No. Grading is assistive feedback for teachers — always verify before sharing marks.",
  },
  {
    q: "Where are my jobs stored?",
    a: "Locally under tmp/jobs when no Blob token is set; otherwise on Vercel Blob. Nothing is written to a database.",
  },
];
