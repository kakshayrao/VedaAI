import { createCanvas } from "@napi-rs/canvas";
import { preprocessImage } from "./preprocess";

const PAGE_CAP = 20;

type RasterPage = {
  page: number;
  buffer: Buffer;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
};

function isPdf(buf: Buffer, mimeHint?: string): boolean {
  if (mimeHint?.includes("pdf")) return true;
  return buf.slice(0, 5).toString() === "%PDF-";
}

async function loadPdfjs() {
  // pdfjs v4+ legacy build for Node
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjs;
}

async function pdfToPages(buf: Buffer): Promise<RasterPage[]> {
  const pdfjs = await loadPdfjs();
  // pdfjs Node/Vercel: legacy build + @napi-rs/canvas (no browser worker)
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buf),
    useSystemFonts: true,
  }).promise;
  const n = Math.min(doc.numPages, PAGE_CAP);
  const pages: RasterPage[] = [];

  for (let i = 1; i <= n; i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    // Target ~2000px wide before preprocess
    const scale = Math.min(2.5, 2000 / base.width);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d");
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;
    const png = canvas.toBuffer("image/png");
    const pre = await preprocessImage(png);
    pages.push({
      page: i,
      buffer: pre.buffer,
      width: pre.width,
      height: pre.height,
      originalWidth: pre.originalWidth,
      originalHeight: pre.originalHeight,
    });
  }
  return pages;
}

async function imageToPage(buf: Buffer): Promise<RasterPage[]> {
  const pre = await preprocessImage(buf);
  return [
    {
      page: 1,
      buffer: pre.buffer,
      width: pre.width,
      height: pre.height,
      originalWidth: pre.originalWidth,
      originalHeight: pre.originalHeight,
    },
  ];
}

/** PDF or image → preprocessed page PNGs (capped). */
export async function toPageImages(
  buf: Buffer,
  mimeHint?: string
): Promise<RasterPage[]> {
  if (isPdf(buf, mimeHint)) return pdfToPages(buf);
  return imageToPage(buf);
}
