# AI Assessment Extraction & Answer Mapping

Upload a question paper and student answer sheet (PDF or images). Gemini vision extracts questions and answer regions; TypeScript maps them deterministically and shows highlight previews for review.

**Live URL:**

## Features

- Extract questions and answer blocks from PDFs/images via Gemini vision
- Deterministic label→question mapping (confidence tiers; low scores stay unmatched)
- Side-by-side review: jump-to-region, answer preview card, polygon highlights when available (else bbox)
- Remap / redraw answer regions in the UI
- Reuse a saved question set so later students skip Q extraction
- Classroom: classes → students → exams → per-student upload → roster → CSV
- Resume mid-run after rate limits (503/429) from the last completed page batch
- Optional assistive grading (async; does not block highlights)
- Storage: local `tmp/` in dev, Vercel Blob when a token is set

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Gemini (`@google/genai`) for vision extraction / grading
- pdf.js + sharp for page images (~2560px longest side)
- Vercel Blob (optional) or local filesystem
- Vitest for mapping unit tests

## Setup

```bash
cp .env.example .env.local
```

| Variable | Required | Notes |
|----------|----------|--------|
| `GEMINI_API_KEY` | Yes | Extraction and grading |
| `GEMINI_MODEL` | No | Default `gemini-3.6-flash` |
| `BLOB_READ_WRITE_TOKEN` | No | Omit → local `tmp/` fallback |
| `STORAGE_MODE` | No | Set `local` to force filesystem |
| `QUESTION_PAGE_BATCH` | No | Default `3` |
| `ANSWER_PAGE_BATCH` | No | Default `2` |

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000

## Usage

### Teacher day workflow

Typical multi-student path via **`/classroom`**:

1. Create a classroom and add students.
2. Create an exam; attach the question paper once (or a saved question set).
3. Upload each student’s answer sheet.
4. Review / remap as needed on the results view.
5. Export CSV from the exam roster (or per-job CSV).

**`/exams`** still works for one-off maps (upload Q paper + answer sheet, or reuse a saved set). From a completed job with a saved question set, use **Map a new answer sheet** to grade another student without re-extracting the paper.

### Resume

On rate-limit / pause with a checkpoint: **Resume** continues from the last completed batch. No checkpoint → re-upload.

## Page batching / free tier

Free-tier API limits are usually **requests/day**. Pages are sent in batches:

| Kind | Env | Default |
|------|-----|---------|
| Question paper | `QUESTION_PAGE_BATCH` | 3 |
| Answer sheet | `ANSWER_PAGE_BATCH` | 2 |

Progress looks like `Extracting questions — pages 4–6 of 12`. Prefer saved question sets for multi-student exams.

## API overview

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/upload` | Upload files |
| `POST` | `/api/jobs` | Create / start job |
| `GET` | `/api/jobs/[id]` | Job status / result |
| `POST` | `/api/jobs/[id]/resume` | Resume paused job |
| `GET` | `/api/jobs/[id]/export` | Per-job CSV |
| `GET/POST` | `/api/question-sets` | List / manage saved Q papers |
| `GET/POST` | `/api/school/classrooms` | Classrooms |
| `GET/POST` | `/api/school/exams` | Exams |
| `GET` | `/api/school/exams/[id]?export=csv` | Exam roster CSV |

## Scripts

| Script | Command |
|--------|---------|
| Dev | `pnpm dev` |
| Production build | `pnpm build` |
| Start | `pnpm start` |
| Tests | `pnpm test` |
| Lint | `pnpm lint` |

## Deploy

1. Push the repo to GitHub.
2. Import on [Vercel](https://vercel.com).
3. Set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`).
4. Enable Vercel Blob and set `BLOB_READ_WRITE_TOKEN` for production storage.
5. Deploy; paste the live URL and GitHub link at the top of this README.

Local-only: omit the Blob token (or set `STORAGE_MODE=local`); jobs/question-sets/classroom data live under `tmp/`.

## Assumptions / limitations

- English papers and answers work best.
- Soft cap ~20 pages per document.
- Bboxes are model estimates; teachers can remap regions.
- Mapping tiers: exact `1.0`, format `0.95`, fuzzy `≥0.80` matched, contextual `0.60` ambiguous at most.
- Free-tier Gemini rate limits apply; use Resume + Q-reuse to save quota.
- Grading is assistive, not authoritative.
- Assignments / library / profile still use localStorage (demo); classroom, exams, and jobs use `tmp/` or Blob.
