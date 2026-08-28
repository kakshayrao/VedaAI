"use client";

export type UploadedFile = { url: string; name: string };

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXT = ["pdf", "png", "jpg", "jpeg", "webp", "gif"];

/** Client-side pre-check mirroring server upload rules; null = OK. */
export function uploadFileError(file: File): string | null {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) return "Use a PDF or image (PNG/JPG/WEBP)";
  if (file.size > MAX_UPLOAD_BYTES) return "File too large (max 50MB)";
  return null;
}

/** Upload into job storage: Blob client path on Vercel; /api/upload for local tmp/. */
export async function uploadJobFile(
  jobId: string,
  kind: "question" | "answer",
  file: File
): Promise<UploadedFile> {
  const modeRes = await fetch("/api/storage");
  const mode = modeRes.ok
    ? ((await modeRes.json()) as { mode?: string }).mode
    : "local";

  if (mode === "blob") {
    const { upload } = await import("@vercel/blob/client");
    const ext = file.name.split(".").pop() || "bin";
    const pathname = `${jobId}/${kind}.${ext}`;
    const blob = await upload(pathname, file, {
      access: "public",
      handleUploadUrl: "/api/upload/blob",
      multipart: true,
      contentType: file.type || "application/octet-stream",
    });
    return { url: blob.url, name: file.name };
  }

  const fd = new FormData();
  fd.set("file", file);
  fd.set("jobId", jobId);
  fd.set("kind", kind);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { url: string; name: string };
  return { url: data.url, name: data.name };
}
