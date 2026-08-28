import { NextResponse } from "next/server";
import { isLocalStorage } from "@/lib/blob";

export const runtime = "nodejs";

/** Tell the browser whether to use client→Blob or /api/upload (local tmp). */
export async function GET() {
  return NextResponse.json({ mode: isLocalStorage() ? "local" : "blob" });
}
