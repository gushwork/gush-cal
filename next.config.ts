import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Next 16.4 defaults to the tsc CLI checker, which also type-checks test
    // files; keep the API checker that excludes *.test.* / *.spec.* files.
    useTypeScriptCli: false,
  },
};

export default nextConfig;
