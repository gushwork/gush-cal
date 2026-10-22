import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Next 16.3 defaults to a full `tsc --noEmit` during build, which includes test files
    // (previously ignored by the build type check). Keep the prior behavior until the
    // pre-existing type errors in *.test.ts / tests/e2e are fixed.
    useTypeScriptCli: false,
  },
};

export default nextConfig;
