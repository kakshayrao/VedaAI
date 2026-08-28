const QUESTION_PAGE_PROMPT = `Extract exam questions from this question-paper page image.

Return JSON only:
{
  "questions": [
    {
      "page": 1,
      "number": "11",
      "part": "a",
      "text": "full question text",
      "marks": 2
    }
  ]
}

Rules:
- Include "page" for every question (page index given with each image).
- Split sub-parts (a)(b)(c) into separate entries with the same number and different part.
- Include marks if visible (e.g. [2], (2 marks)).
- Ignore headers, footers, page numbers, instructions not tied to a numbered question.
- Preserve question wording faithfully.
- If no questions on this page, return {"questions":[]}.`;

export function questionPagesPrompt(pages: number[]): string {
  const list = pages.join(", ");
  return `${QUESTION_PAGE_PROMPT}

You are given ${pages.length} page image(s) in order: pages ${list}.
Each image is preceded by a "Page N" label — put that N in every question's "page" field.`;
}

const ANSWER_PAGE_PROMPT = `Detect physical student answer blocks on handwritten answer-sheet page image(s).

Return JSON only:
{
  "answer_blocks": [
    {
      "page": 1,
      "id": "p{PAGE}-b{N}",
      "label": "11(a)",
      "labelPresent": true,
      "continuationOf": null,
      "isContinuation": false,
      "detection": "answer",
      "regions": [
        { "kind": "label", "box": [ymin,xmin,ymax,xmax] },
        { "kind": "body", "box": [ymin,xmin,ymax,xmax], "polygon": null }
      ],
      "text": "transcribed student answer text",
      "extractionConfidence": 0.9
    }
  ]
}

Rules:
- Include "page" on every block (page index given with each image).
- Identify physical answer blocks (student ink), not just OCR lines.
- Separate label region vs body region when a label is visible. Always return body bbox.
- box is [ymin,xmin,ymax,xmax] on a 0–1000 scale of that page image.
- polygon only when you can confidently trace the handwritten region; otherwise omit/null.
- Set continuationOf to a prior block id (e.g. "p2-b1") when sure this continues that answer; isContinuation alone is a weak signal.
- detection: "answer" | "possible_answer" | "noise".
  noise = signatures, page numbers, rough work, crossed-out scribble, teacher ticks/stamps.
- IGNORE printed text, headers, page numbers, teacher/examiner markings, red ticks, stamps, signatures unless clearly part of the student response.
- Use id format p{PAGE}-b{INDEX} with 1-based index on that page.`;

export function answerPagesPrompt(pages: number[]): string {
  const list = pages.join(", ");
  return `${ANSWER_PAGE_PROMPT}

You are given ${pages.length} page image(s) in order: pages ${list}.
Each image is preceded by a "Page N" label — put that N in every block's "page" field and in ids.`;
}

export function gradingPrompt(questionText: string, maxMarks: number | undefined, answerText: string): string {
  return `Grade this student answer against the question. Be concise and fair.

Question: ${questionText}
Max marks: ${maxMarks ?? "unknown"}

Student answer:
${answerText}

Return JSON only:
{
  "score": number,
  "maxScore": number,
  "verdict": "correct" | "partial" | "incorrect",
  "feedback": "1-3 sentences of teacher-style feedback"
}`;
}
