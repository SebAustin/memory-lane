import type { NextConfig } from "next";
import { getServerConfig } from "./src/config/server-config";

// H1: validate the environment when Next loads its config (build, dev and
// start), so an unsafe or malformed environment fails the build or deploy
// instead of the first request. Throws ConfigError; messages never echo values.
getServerConfig(process.env);

const nextConfig: NextConfig = {
  // SC-11 / NFR-13: never ship source maps (and any inlined source) to browsers.
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
};

export default nextConfig;
