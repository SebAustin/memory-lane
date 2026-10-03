import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SC-11 / NFR-13: never ship source maps (and any inlined source) to browsers.
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
};

export default nextConfig;
