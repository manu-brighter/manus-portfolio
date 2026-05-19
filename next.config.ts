import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  // Cross-origin allowlist for `next dev` — needed when accessing the
  // dev server from another device on the LAN (iPhone testing during
  // mobile bug-hunts). Without this, the HMR WebSocket fails with a
  // cross-origin block even though the HTTP page loads fine. Glob
  // patterns are supported; wildcards keep it working across IP
  // changes from the router. No effect on production builds.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  experimental: {
    optimizePackageImports: [
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      "gsap",
      "@gsap/react",
    ],
  },
  turbopack: {
    rules: {
      "*.glsl": {
        // raw-loader + `as: "*.js"` is the only working pattern for
        // Turbopack-built static export — Turbopack-native `type: "raw"`
        // alone produces an asset URL, not a string default export, and
        // every `import x from "*.glsl"` ends up undefined at runtime.
        // raw-loader is archived but functional; replacing it requires
        // either inlining all shader sources or migrating to per-import
        // `?raw` query suffix (call-site refactor).
        // Mirror of the webpack `asset/source` rule below.
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.glsl$/,
      type: "asset/source",
    });
    return config;
  },
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(withMDX(nextConfig));
