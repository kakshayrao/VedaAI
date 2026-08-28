import { NextRequest, NextResponse } from "next/server";
import { storeFile, jobKey } from "@/lib/blob";

export const runtime = "nodejs";

const MAX_BYTES = 50 * 1024 * 1024;
const SAFE_ID = /^[A-Za-z0-9-]{1,64}$/;
const ALLOWED_EXT = new Set(["pdf", "png", "jpg", "jpeg", "webp", "gif"]);

/** Upload a file into job storage; returns public/local URL. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const jobId = String(form.get("jobId") || "");
  const kind = String(form.get("kind") || "");

  if (!(file instanceof File) || !SAFE_ID.test(jobId)) {
    return NextResponse.json({ error: "file and jobId required" }, { status: 400 });
  }
  if (kind !== "question" && kind !== "answer") {
    return NextResponse.json({ error: "kind must be question or answer" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
  }
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      { error: "Unsupported file type — upload a PDF or image (PNG/JPG/WEBP)" },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const key = jobKey(jobId, `${kind}.${ext}`);
  const url = await storeFile(key, buf, file.type || "application/octet-stream");

  return NextResponse.json({
    url,
    name: file.name,
    size: file.size,
    contentType: file.type,
  });
}
