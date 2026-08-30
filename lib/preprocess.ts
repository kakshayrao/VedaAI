const MAX_SIDE = 2560; // ponytail: mid of 2048–3000

type PreprocessResult = {
  buffer: Buffer;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  mimeType: string;
};

async function getSharp(): Promise<any | null> {
  try {
    const mod = await import("sharp");
    return (mod as any).default ?? mod;
  } catch {
    return null;
  }
}

function parseImageDimensions(input: Buffer): { width: number; height: number; mimeType: string } {
  if (input.length >= 8 && input[0] === 0x89 && input[1] === 0x50 && input[2] === 0x4e && input[3] === 0x47) {
    const width = input.readUInt32BE(8);
    const height = input.readUInt32BE(12);
    return { width, height, mimeType: "image/png" };
  }

  if (input[0] === 0xff && input[1] === 0xd8) {
    let i = 2;
    while (i < input.length) {
      if (input[i] !== 0xff) break;
      const marker = input[i + 1];
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2 || marker === 0xc3 || marker === 0xc5 || marker === 0xc6 || marker === 0xc7 || marker === 0xc9 || marker === 0xca || marker === 0xcb) {
        const height = input.readUInt16BE(i + 5);
        const width = input.readUInt16BE(i + 7);
        return { width, height, mimeType: "image/jpeg" };
      }
      const blockLength = input.readUInt16BE(i + 2);
      i += 2 + blockLength;
    }
  }

  return { width: 1, height: 1, mimeType: "image/png" };
}

/** Orient + resize longest side to ~2560px. If Sharp isn't available or fails, keep the original bytes and size metadata instead of crashing the job API. */
export async function preprocessImage(input: Buffer): Promise<PreprocessResult> {
  const fallback = (() => {
    const dims = parseImageDimensions(input);
    return {
      buffer: input,
      width: dims.width,
      height: dims.height,
      originalWidth: dims.width,
      originalHeight: dims.height,
      mimeType: dims.mimeType,
    };
  })();

  try {
    const sharp = await getSharp();
    if (!sharp) return fallback;

    const meta = await sharp(input).metadata();
    const originalWidth = meta.width || fallback.originalWidth;
    const originalHeight = meta.height || fallback.originalHeight;

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
  } catch {
    return fallback;
  }
}
