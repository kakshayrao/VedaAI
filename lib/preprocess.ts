import sharp from "sharp";

const MAX_SIDE = 2560; // ponytail: mid of 2048–3000

type PreprocessResult = {
  buffer: Buffer;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  mimeType: string;
};

/** Orient + resize longest side to ~2560px. */
export async function preprocessImage(input: Buffer): Promise<PreprocessResult> {
  const meta = await sharp(input).metadata();
  const originalWidth = meta.width || 1;
  const originalHeight = meta.height || 1;

  let pipeline = sharp(input).rotate(); // EXIF orient
  const longest = Math.max(originalWidth, originalHeight);
  if (longest > MAX_SIDE) {
    pipeline = pipeline.resize({
      width: originalWidth >= originalHeight ? MAX_SIDE : undefined,
      height: originalHeight > originalWidth ? MAX_SIDE : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const { data, info } = await pipeline.png().toBuffer({ resolveWithObject: true });
  return {
    buffer: data,
    width: info.width,
    height: info.height,
    originalWidth,
    originalHeight,
    mimeType: "image/png",
  };
}
