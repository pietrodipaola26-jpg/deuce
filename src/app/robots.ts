import type { MetadataRoute } from "next";

/**
 * Only the marketing pages and the legal ones are for crawlers.
 *
 * Everything behind the sign-in is disallowed here as a courtesy to well-behaved
 * crawlers — it is not the protection. The protection is that the database returns
 * no rows to a signed-out caller, which is what makes "nobody sees anything before
 * they have an account" true rather than merely unadvertised.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/games", "/my-games", "/players", "/profile", "/notifications", "/settings", "/onboarding", "/login", "/signup", "/auth/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
