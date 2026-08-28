import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { isLocalStorage } from "@/lib/blob";

export const runtime = "nodejs";

/** Client token + completion for direct browser→Blob uploads (bypasses 4.5MB body limit). */
export async function POST(request: NextRequest) {
  if (isLocalStorage()) {
    return NextResponse.json({ error: "blob uploads disabled in local mode" }, { status: 400 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN not set" }, { status: 500 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // jobId/kind.ext — UUID or similar single segment
        if (!/^[^/]+\/(question|answer)\.[A-Za-z0-9]+$/.test(pathname)) {
          throw new Error("invalid upload pathname");
        }
        return {
          allowedContentTypes: [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/jpg",
            "application/octet-stream",
          ],
          maximumSizeInBytes: 50 * 1024 * 1024,
          addRandomSuffix: false,
          allowOverwrite: true,
        };
      },
    });
    return NextResponse.json(json);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
