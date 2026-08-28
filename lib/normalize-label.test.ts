import { describe, expect, it } from "vitest";
import { parseLabel } from "./normalize-label";

describe("parseLabel", () => {
  it("parses letter and roman parts", () => {
    expect(parseLabel("11(a)")).toEqual({ number: "11", part: "a" });
    expect(parseLabel("5(iii)")).toEqual({ number: "5", part: "iii" });
    expect(parseLabel("Q12-iv")).toEqual({ number: "12", part: "iv" });
  });

  it("parses nested 12(c)(i)", () => {
    expect(parseLabel("12(c)(i)")).toEqual({ number: "12", part: "ci" });
  });

  it('rejects trailing words like "11 marks"', () => {
    expect(parseLabel("11 marks")).toBeNull();
  });
});
