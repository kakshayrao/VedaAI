import { put, list } from "@vercel/blob";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const LOCAL_JOBS = path.join(process.cwd(), "tmp", "jobs");
const LOCAL_TMP = path.join(process.cwd(), "tmp");

export function isLocalStorage(): boolean {
  // Vercel FS is ephemeral — never treat tmp/ as durable there
  if (process.env.VERCEL) return false;
  return process.env.STORAGE_MODE === "local" || !process.env.BLOB_READ_WRITE_TOKEN;
}

export function jobKey(jobId: string, name: string) {
  return `${jobId}/${name}`;
}

/** Shared choke point: every local FS path goes through here, so traversal is blocked once. */
function assertSafeKey(key: string) {
  const parts = key.split("/");
  const bad = !parts.length || parts.some((p) => !p || p === "." || p === ".." || p.includes("\\"));
  if (bad) throw new Error("unsafe storage key");
}

/** Jobs live under tmp/jobs; question-sets/* and school/* under tmp/. */
async function localPath(key: string) {
  assertSafeKey(key);
  const underTmp = key.startsWith("question-sets/") || key.startsWith("school/");
  const root = underTmp ? LOCAL_TMP : LOCAL_JOBS;
  const full = path.join(root, ...key.split("/"));
  await mkdir(path.dirname(full), { recursive: true });
  return full;
}

/**
 * True only for URLs our own storage produced (local file route or this
 * project's Vercel Blob store). Job inputs must pass this so the pipeline
 * never fetches arbitrary attacker-supplied URLs server-side.
 */
export function isStoredDocumentUrl(url: string): boolean {
  if (url.startsWith("/api/local-files/")) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function storeFile(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<string> {
  const buf = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  if (isLocalStorage()) {
    const fp = await localPath(key);
    await writeFile(fp, buf);
    return `/api/local-files/${key}`;
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is required on Vercel. Enable Blob storage and set the token."
    );
  }

  try {
    const blob = await put(key, buf, {
      access: "public",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return blob.url;
  } catch {
    const fp = await localPath(key);
    await writeFile(fp, buf);
    return `/api/local-files/${key}`;
  }
}

export async function storeJson(key: string, value: unknown): Promise<string> {
  return storeFile(key, JSON.stringify(value, null, 0), "application/json");
}

export async function resolveUrl(key: string): Promise<string | null> {
  if (isLocalStorage()) {
    try {
      await readFile(await localPath(key));
      return `/api/local-files/${key}`;
    } catch {
      return null;
    }
  }

  try {
    const { blobs } = await list({ prefix: key, limit: 20 });
    const exact = blobs.find((b) => b.pathname === key);
    if (exact?.url) return exact.url;
    if (blobs[0]?.url) return blobs[0].url;
  } catch {
    // fall through to local storage fallback below
  }

  try {
    await readFile(await localPath(key));
    return `/api/local-files/${key}`;
  } catch {
    return null;
  }
}

export async function readJson<T>(keyOrUrl: string): Promise<T | null> {
  try {
    if (keyOrUrl.startsWith("http")) {
      const res = await fetch(keyOrUrl);
      if (!res.ok) return null;
      return (await res.json()) as T;
    }
    if (isLocalStorage() || keyOrUrl.startsWith("/api/local-files/")) {
      const key = keyOrUrl.replace(/^\/api\/local-files\//, "");
      const raw = await readFile(await localPath(key), "utf8");
      return JSON.parse(raw) as T;
    }
    const url = await resolveUrl(keyOrUrl);
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    const fallbackKey = keyOrUrl.replace(/^\/api\/local-files\//, "");
    try {
      const raw = await readFile(await localPath(fallbackKey), "utf8");
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}

export async function readBytes(keyOrUrl: string): Promise<Buffer> {
  if (keyOrUrl.startsWith("http")) {
    const res = await fetch(keyOrUrl);
    if (!res.ok) throw new Error(`fetch failed ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  if (isLocalStorage() || keyOrUrl.startsWith("/api/local-files/")) {
    const key = keyOrUrl.replace(/^\/api\/local-files\//, "");
    return readFile(await localPath(key));
  }

  try {
    const url = await resolveUrl(keyOrUrl);
    if (!url) throw new Error(`Missing blob ${keyOrUrl}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch failed ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } catch {
    const key = keyOrUrl.replace(/^\/api\/local-files\//, "");
    return readFile(await localPath(key));
  }
}
