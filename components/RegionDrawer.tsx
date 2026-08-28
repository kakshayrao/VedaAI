"use client";

import type { AnswerRegion } from "@/lib/types";
import { dragToBox } from "@/lib/regions";

/** Drag-to-draw body region on the answer sheet (0–1000 coords). */
export function RegionDrawer({
  page,
  onComplete,
}: {
  page: number;
  onComplete: (region: AnswerRegion) => void;
}) {
  return (
    <div
      className="absolute inset-0 z-10 cursor-crosshair"
      onMouseDown={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const p0 = { x: e.clientX, y: e.clientY };
        const up = (ev: MouseEvent) => {
          window.removeEventListener("mouseup", up);
          onComplete({
            page,
            kind: "body",
            box: dragToBox(rect, p0, { x: ev.clientX, y: ev.clientY }),
          });
        };
        window.addEventListener("mouseup", up);
      }}
    />
  );
}
