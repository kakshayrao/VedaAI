import { describe, expect, it } from "vitest";
import { isTransientGeminiError } from "./gemini";

describe("isTransientGeminiError", () => {
  it("retries 503 / UNAVAILABLE / RESOURCE_EXHAUSTED", () => {
    expect(isTransientGeminiError(Object.assign(new Error("503 UNAVAILABLE"), { status: 503 }))).toBe(
      true
    );
    expect(isTransientGeminiError(new Error("UNAVAILABLE — high demand — try again later"))).toBe(
      true
    );
    expect(isTransientGeminiError(new Error("RESOURCE_EXHAUSTED"))).toBe(true);
    expect(isTransientGeminiError(Object.assign(new Error("rate"), { status: 429 }))).toBe(true);
  });

  it("does not retry 400 / 404", () => {
    expect(isTransientGeminiError(Object.assign(new Error("Bad Request"), { status: 400 }))).toBe(
      false
    );
    expect(isTransientGeminiError(Object.assign(new Error("Not Found"), { status: 404 }))).toBe(
      false
    );
    expect(isTransientGeminiError(new Error("INVALID_ARGUMENT"))).toBe(false);
  });
});
