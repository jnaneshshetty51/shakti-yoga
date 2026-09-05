import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin the workspace root so Next doesn't guess it from a parent lockfile.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
