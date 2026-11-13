import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Problems written with the authoring tool (demo mode) are JSON files in
  // content/authored; ship them with every server function.
  outputFileTracingIncludes: {
    "/**": ["./content/authored/**/*.json"],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
