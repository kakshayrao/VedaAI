import { describe, expect, it } from "vitest";
import { preprocessImage } from "./preprocess";

describe("preprocessImage", () => {
  it("processes a valid PNG without crashing", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB4L" +
        "7M0AAAAAXNSR9I1AAAAAElFTkSuQmCC",
      "base64"
    );

    const result = await preprocessImage(png);

    expect(result.mimeType).toBe("image/png");
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it("falls back safely when the input is invalid or Sharp fails", async () => {
    const bad = Buffer.from("not-an-image");

    const result = await preprocessImage(bad);

    expect(result.mimeType).toBe("image/png");
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    expect(result.buffer.equals(bad)).toBe(true);
  });
});
