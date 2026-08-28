import { NextRequest, NextResponse } from "next/server";
import { generateJsonText, isTransientGeminiError } from "@/lib/gemini";

export const runtime = "nodejs";

type GenOut = {
  questions: { number: string; text: string; marks?: number }[];
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const subject = String(body.subject || "Science").slice(0, 80);
  const topic = String(body.topic || "General").slice(0, 120);
  const count = Math.min(Math.max(Number(body.count) || 5, 1), 10);
  const classLevel = String(body.classLevel || "Class 10").slice(0, 40);

  if (!process.env.GEMINI_API_KEY) {
    // Demo fallback when key missing
    const questions = Array.from({ length: count }, (_, i) => ({
      number: String(i + 1),
      text: `[Demo] ${classLevel} ${subject} — ${topic}: Explain concept ${i + 1} with an example.`,
      marks: i === count - 1 ? 5 : 2,
    }));
    return NextResponse.json({ questions, source: "demo" });
  }

  try {
    const data = await generateJsonText<GenOut>(
      `Generate ${count} short exam questions for ${classLevel} ${subject} on "${topic}".
Return JSON: {"questions":[{"number":"1","text":"...","marks":2}]}
Keep each question under 40 words. No answers.`
    );
    return NextResponse.json({
      questions: (data.questions || []).slice(0, count),
      source: "gemini",
    });
  } catch (e) {
    // Never surface raw provider errors to the browser
    const msg = isTransientGeminiError(e)
      ? "Gemini is busy or rate-limited — try again in a minute"
      : "Generation failed — try again";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
