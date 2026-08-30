# AI Assessment Extraction & Answer Mapping

Upload a question paper and student answer sheet (PDF or images). Gemini vision extracts questions and answer regions; TypeScript maps them deterministically and shows highlight previews for review.

**Live URL:** _(paste Vercel URL after deploy)_

**GitHub:** _(paste repo URL)_

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

## Architecture

```
upload (PDF/images)
  → page rasters (pdf.js + sharp, ~2560px)
  → Gemini vision (questions, then answer regions)
  → deterministic TypeScript mapping + optional async grading
  → review UI (highlights, remap, redraw) / classroom roster / CSV
```

Jobs checkpoint after each page batch so **Resume** skips finished pages. Saved question sets skip Q extraction for later students. Storage is `tmp/` locally or Vercel Blob in production.

### Coordinate system

Gemini returns regions as `[ymin, xmin, ymax, xmax]` on a **0–1000** grid of the **preprocessed page image** (not the original PDF crop). The UI converts those to CSS percentages (`value / 10`). Polygons are remapped into bbox-local SVG space. Manual redraw writes back to the same 0–1000 box.

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
| `BLOB_READ_WRITE_TOKEN` | **Yes on Vercel** | Local: omit → `tmp/`. Vercel FS is ephemeral — Blob is required |
| `STORAGE_MODE` | No | Set `local` for filesystem (ignored on Vercel) |
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
| `GET` | `/api/storage` | `local` vs `blob` upload mode |
| `POST` | `/api/upload` | Server upload (local / small files) |
| `POST` | `/api/upload/blob` | Client→Blob token (Vercel large PDFs) |
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

## Deploy (Vercel)

1. Push the repo to GitHub (or connect this folder).
2. Import on [Vercel](https://vercel.com) — framework **Next.js**, install `pnpm install` (see `packageManager` in `package.json`).
3. Create a **Blob** store for the project (Storage → Blob) so `BLOB_READ_WRITE_TOKEN` is linked.
4. Project → Settings → Environment Variables (Production):

| Name | Value |
|------|--------|
| `GEMINI_API_KEY` | your key |
| `GEMINI_MODEL` | `gemini-3.6-flash` (or preferred) |
| `BLOB_READ_WRITE_TOKEN` | from Blob store (auto if store linked) |
| `QUESTION_PAGE_BATCH` | `3` (optional) |
| `ANSWER_PAGE_BATCH` | `2` (optional) |

5. Deploy. Prefer **Pro** if long PDFs need `maxDuration` up to 300s; on Hobby, use **Resume** after rate limits / timeouts (checkpoints are on Blob).
6. Paste the Live URL (and GitHub link) at the top of this README.

Uploads on Vercel go **browser → Blob** (multipart) so PDFs above the ~4.5MB serverless body limit still work. Local: omit the Blob token (or `STORAGE_MODE=local`); data lives under `tmp/`.

## Assumptions / limitations

- English papers and answers work best.
- Soft cap ~20 pages per document.
- Bboxes are model estimates; teachers can remap regions.
- Mapping tiers: exact `1.0`, format `0.95`, fuzzy `≥0.80` matched, contextual `0.60` ambiguous at most.
- Free-tier Gemini rate limits apply; use Resume + Q-reuse to save quota.
- Grading is assistive, not authoritative.
- Assignments / library / profile still use localStorage (demo); classroom, exams, and jobs use `tmp/` or Blob.
