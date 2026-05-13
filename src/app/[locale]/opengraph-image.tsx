import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { renderSocialCard } from "@/lib/seo/socialCard";

// Dynamic OG image — 1200x630 paper-bg with Manuel's brand PNG
// upper-left and the localised title + tagline right-aligned.
// Pre-rendered at build-time per locale by Next.js metadata API;
// consumed by social-share previews (Discord, Slack, Twitter, LinkedIn).
//
// Layout + brand-PNG fetch live in `@/lib/seo/socialCard` (shared with
// twitter-image.tsx — same shape, different size).

// Required for `output: "export"` static-export mode — Next 16 won't
// pre-render dynamic OG routes without an explicit force-static.
export const dynamic = "force-static";
export const alt = "Manuel Heller — Craft Portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function OpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return renderSocialCard({ locale, width: size.width, height: size.height });
}
