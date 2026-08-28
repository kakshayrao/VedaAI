import { describe, expect, it } from "vitest";
import { boxToPercent, dragToBox, polygonPointsInBox } from "./regions";

describe("boxToPercent", () => {
  it("maps 0–1000 box to CSS percentages", () => {
    expect(boxToPercent([100, 200, 400, 600])).toEqual({
      top: "10%",
      left: "20%",
      height: "30%",
      width: "40%",
    });
  });
});

describe("polygonPointsInBox", () => {
  it("remaps page-absolute [y,x] into bbox-local 0–100", () => {
    expect(polygonPointsInBox([[100, 200], [400, 600]], [100, 200, 400, 600])).toBe("0,0 100,100");
  });
});

describe("dragToBox", () => {
  const rect = { left: 0, top: 0, width: 200, height: 100 };

  it("converts client drag to 0–1000 box, order-independent", () => {
    expect(dragToBox(rect, { x: 20, y: 10 }, { x: 180, y: 90 })).toEqual([100, 100, 900, 900]);
    expect(dragToBox(rect, { x: 180, y: 90 }, { x: 20, y: 10 })).toEqual([100, 100, 900, 900]);
  });

  it("clamps outside the page rect", () => {
    expect(dragToBox(rect, { x: -50, y: -50 }, { x: 400, y: 200 })).toEqual([0, 0, 1000, 1000]);
  });
});
