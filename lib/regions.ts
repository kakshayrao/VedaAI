import type { AnswerRegion } from "./types";

/**
 * Coordinate system: Gemini returns boxes as [ymin, xmin, ymax, xmax] on a
 * 0–1000 grid of the preprocessed page image. The UI renders pages at any
 * zoom, so overlays are positioned in percentages — resolution-independent.
 */
export function boxToPercent(box: AnswerRegion["box"]): {
  top: string;
  left: string;
  height: string;
  width: string;
} {
  const [ymin, xmin, ymax, xmax] = box;
  return {
    top: `${ymin / 10}%`,
    left: `${xmin / 10}%`,
    height: `${(ymax - ymin) / 10}%`,
    width: `${(xmax - xmin) / 10}%`,
  };
}

/** Remap page-absolute polygon [y,x] points into bbox-local 0–100 space for an SVG inside the box. */
export function polygonPointsInBox(
  polygon: [number, number][],
  box: [number, number, number, number]
): string {
  const [ymin, xmin, ymax, xmax] = box;
  const h = ymax - ymin || 1;
  const w = xmax - xmin || 1;
  return polygon.map(([y, x]) => `${((x - xmin) / w) * 100},${((y - ymin) / h) * 100}`).join(" ");
}

/** Drag rectangle in client pixels → 0–1000 page box (order-independent corners, clamped). */
export function dragToBox(
  rect: { left: number; top: number; width: number; height: number },
  p0: { x: number; y: number },
  p1: { x: number; y: number }
): [number, number, number, number] {
  const to1000 = (v: number, offset: number, size: number) =>
    Math.max(0, Math.min(1000, ((v - offset) / (size || 1)) * 1000));
  const x0 = to1000(p0.x, rect.left, rect.width);
  const y0 = to1000(p0.y, rect.top, rect.height);
  const x1 = to1000(p1.x, rect.left, rect.width);
  const y1 = to1000(p1.y, rect.top, rect.height);
  return [Math.min(y0, y1), Math.min(x0, x1), Math.max(y0, y1), Math.max(x0, x1)];
}
