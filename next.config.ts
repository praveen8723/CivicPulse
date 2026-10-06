import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  devIndicators: false,
  distDir: process.env.CIVICPULSE_BUILD_DIR || ".next",
};
export default nextConfig;
