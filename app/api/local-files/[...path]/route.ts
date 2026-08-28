import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { isLocalStorage } from "@/lib/blob";

export const runtime = "nodejs";

/** Dev-only file server for tmp/jobs when STORAGE_MODE=local or no Blob token. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  if (!isLocalStorage()) {
    return NextResponse.json({ error: "local files disabled" }, { status: 404 });
  }
  const { path: parts } = await ctx.params;
  // Jobs: /api/local-files/{jobId}/... ;
  // question sets / school: /api/local-files/question-sets|school/...
  const underTmp = parts[0] === "question-sets" || parts[0] === "school";
  const root = underTmp
    ? path.join(process.cwd(), "tmp")
    : path.join(process.cwd(), "tmp", "jobs");
  const filePath = path.join(root, ...parts);
  // path.relative catches both ../ escapes and sibling-prefix tricks
  // (e.g. tmp/jobs-evil passing a naive startsWith(tmp/jobs) check).
  const rel = path.relative(root, filePath);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }
  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const type =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".pdf"
            ? "application/pdf"
            : ext === ".json"
              ? "application/json"
              : "application/octet-stream";
    return new NextResponse(data, { headers: { "Content-Type": type } });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
