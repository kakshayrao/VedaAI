import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist", "sharp"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
