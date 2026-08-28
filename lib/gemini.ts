import { GoogleGenAI } from "@google/genai";

function geminiModel(): string {
  return process.env.GEMINI_MODEL || "gemini-3.6-flash";
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey });
}

/** True for overload / rate-limit style failures worth retrying. */
export function isTransientGeminiError(err: unknown): boolean {
  const status =
    typeof err === "object" && err && "status" in err
      ? Number((err as { status: unknown }).status)
      : undefined;
  if (status === 503 || status === 429) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /503|UNAVAILABLE|RESOURCE_EXHAUSTED|\b429\b|high demand|try again later|Too Many Requests/i.test(
    msg
  );
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isTransientGeminiError(e) || i === attempts - 1) throw e;
      // 2s → 4s → 8s → 16s → 32s
      await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
    }
  }
  throw last;
}

export async function generateJsonFromImages<T>(opts: {
  prompt: string;
  images: { bytes: Buffer; mimeType?: string; label?: string }[];
}): Promise<T> {
  if (!opts.images.length) throw new Error("at least one image required");
  return withRetry(async () => {
    const ai = getClient();
    const model = geminiModel();
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: opts.prompt },
    ];
    for (const img of opts.images) {
      if (img.label) parts.push({ text: img.label });
      parts.push({
        inlineData: {
          mimeType: img.mimeType || "image/png",
          data: img.bytes.toString("base64"),
        },
      });
    }
    const res = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });
    const text = res.text?.trim() || "";
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    return JSON.parse(cleaned) as T;
  });
}

export async function generateJsonText<T>(prompt: string): Promise<T> {
  return withRetry(async () => {
    const ai = getClient();
    const res = await ai.models.generateContent({
      model: geminiModel(),
      contents: prompt,
      config: { responseMimeType: "application/json", temperature: 0.2 },
    });
    const text = res.text?.trim() || "";
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    return JSON.parse(cleaned) as T;
  });
}
