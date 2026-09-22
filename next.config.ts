import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

/**
 * `turbopack.root` is pinned deliberately.
 *
 * Turbopack infers the workspace root by walking up for the nearest lockfile.
 * This project sits in a home directory alongside other Node projects, and an
 * inferred root outside this folder makes the bundler compile files that belong
 * to a different app. Pinning it keeps the build hermetic.
 */
const here = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: here },

  /**
   * `127.0.0.1` and `localhost` are different origins to a browser.
   *
   * The dev server prints `localhost:3000`, but Supabase's redirect URLs and
   * NEXT_PUBLIC_SITE_URL use `127.0.0.1:3000` so that the emailed sign-in link
   * lands somewhere stable. Without this, opening the app on 127.0.0.1 gets its
   * HMR socket and dev resources blocked as cross-origin. Development only —
   * Next.js ignores it in a production build.
   */
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Fail the production build on a type or lint error rather than shipping it.
  typedRoutes: true,
};

export default nextConfig;
