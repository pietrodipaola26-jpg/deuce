import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LEGAL_DOCS, legalDoc } from "@/content/legal";
import { Eyebrow } from "@/components/ui/pieces";

/** Three documents, known at build time, so all three are static. */
export function generateStaticParams() {
  return LEGAL_DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  // params is a Promise in Next.js 16 — synchronous access was removed.
  const { slug } = await params;
  const doc = legalDoc(slug);
  if (!doc) return { title: "Not found" };
  return { title: doc.title, description: doc.intro };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = legalDoc(slug);
  if (!doc) notFound();

  return (
    <article className="mx-auto max-w-2xl px-5 py-14 sm:px-8 sm:py-20">
      <Eyebrow>Deuce</Eyebrow>
      <h1 className="mt-4 font-display text-[2.25rem] leading-[1.06] font-semibold tracking-[-0.03em] text-ink">
        {doc.title}
      </h1>
      <p className="num mt-3 text-sm text-ink-faint">Last updated {doc.updated}</p>
      <p className="mt-6 text-[1.0625rem] leading-relaxed text-ink-soft">{doc.intro}</p>

      <div className="mt-12 flex flex-col gap-10">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-xl leading-snug font-medium tracking-[-0.015em] text-ink">
              {section.heading}
            </h2>
            <div className="mt-3 flex flex-col gap-3">
              {section.body.map((p, i) => (
                <p key={i} className="text-[0.9375rem] leading-relaxed text-ink-soft">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <nav className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t border-hairline pt-6 text-sm">
        {LEGAL_DOCS.filter((d) => d.slug !== doc.slug).map((d) => (
          <Link
            key={d.slug}
            href={`/legal/${d.slug}`}
            className="rounded font-medium text-court-text underline underline-offset-4"
          >
            {d.title}
          </Link>
        ))}
      </nav>
    </article>
  );
}
