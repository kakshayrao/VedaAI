import { describe, expect, it } from "vitest";
import { chunkBatch, formatPageRange, pendingPages } from "./page-batch";

describe("chunkBatch", () => {
  it("splits into fixed-size batches", () => {
    expect(chunkBatch([1, 2, 3, 4, 5], 3)).toEqual([[1, 2, 3], [4, 5]]);
    expect(chunkBatch(["a"], 2)).toEqual([["a"]]);
    expect(chunkBatch([], 3)).toEqual([]);
  });

  it("treats size < 1 as 1", () => {
    expect(chunkBatch([1, 2], 0)).toEqual([[1], [2]]);
  });
});

describe("formatPageRange", () => {
  it("formats single and multi page ranges", () => {
    expect(formatPageRange(4, 4, 12)).toBe("page 4 of 12");
    expect(formatPageRange(4, 6, 12)).toBe("pages 4–6 of 12");
  });
});

describe("pendingPages", () => {
  it("keeps only pages after lastDone", () => {
    const pages = [{ page: 1 }, { page: 2 }, { page: 3 }, { page: 4 }];
    expect(pendingPages(pages, 2).map((p) => p.page)).toEqual([3, 4]);
    expect(pendingPages(pages, 4)).toEqual([]);
    expect(pendingPages(pages, 0).map((p) => p.page)).toEqual([1, 2, 3, 4]);
  });
});
