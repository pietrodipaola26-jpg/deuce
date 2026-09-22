import type { MetadataRoute } from "next";

import { LEGAL_DOCS } from "@/content/legal";

/** The public surface: the landing page and the three legal documents. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";

  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    ...LEGAL_DOCS.map((d) => ({
      url: `${base}/legal/${d.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
