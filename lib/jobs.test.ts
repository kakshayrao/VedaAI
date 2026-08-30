import { afterEach, describe, expect, it, vi } from "vitest";

const listMock = vi.fn();
vi.mock("@vercel/blob", () => ({
  list: listMock,
}));

const readdirMock = vi.fn();
const readFileMock = vi.fn();
vi.mock("fs/promises", () => ({
  readdir: readdirMock,
  readFile: readFileMock,
}));

describe("listJobs", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.VERCEL;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.STORAGE_MODE;
  });

  it("includes local fallback jobs even when Vercel Blob is empty", async () => {
    process.env.VERCEL = "1";
    delete process.env.BLOB_READ_WRITE_TOKEN;

    listMock.mockResolvedValue({ blobs: [] });
    readdirMock.mockResolvedValue([
      { name: "job-123", isDirectory: () => true },
      { name: "job-456", isDirectory: () => true },
    ]);
    readFileMock.mockImplementation(async (file: string) => {
      if (file.includes("job-123")) {
        return JSON.stringify({
          id: "job-123",
          status: "ready",
          createdAt: "2026-01-01T00:00:00.000Z",
          questionName: "Q1",
          result: { summary: { answered: 2, unanswered: 0, unmatched: 0, unlabelled: 0, ambiguous: 0 } },
        });
      }
      return JSON.stringify({
        id: "job-456",
        status: "uploading",
        createdAt: "2026-01-01T00:00:00.000Z",
        questionName: "Q2",
      });
    });

    const { listJobs } = await import("./jobs");
    const jobs = await listJobs();

    expect(jobs.map((j) => j.id)).toEqual(["job-123", "job-456"]);
  });
});
