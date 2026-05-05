import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

// Dynamic Twitter card image — 1200x600 paper-bg with Manuel's brand
// PNG upper-left and the localised title + tagline right-aligned.
// Twitter card aspect (2:1) is slightly squarer than OG (1.91:1).
// Pre-rendered at build-time per locale by Next.js metadata API.
//
// Note: Satori (the renderer behind next/og's ImageResponse) supports
// <img> with data URLs but NOT arbitrary filesystem paths — we read
// the brand PNG and inline it as base64 at request time.

// Required for `output: "export"` static-export mode — Next 16 won't
// pre-render dynamic Twitter card routes without an explicit force-static.
export const dynamic = "force-static";
export const alt = "Manuel Heller — Craft Portfolio";
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

async function getBrandImageDataUrl() {
  const filePath = path.join(process.cwd(), "public", "brand", "icon-source.png");
  const buffer = await readFile(filePath);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export default async function TwitterImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "meta" });
  const brandSrc = await getBrandImageDataUrl();

  return new ImageResponse(
    <div
      style={{
        position: "relative",
        width: 1200,
        height: 600,
        display: "flex",
        background: "#F0E8D7",
        padding: 80,
        fontFamily: "serif",
        color: "#0A0608",
      }}
    >
      {/* Brand mark — Manuel's PNG, left column */}
      <div
        style={{
          width: 320,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {/* biome-ignore lint/performance/noImgElement: Satori-rendered, no Next/Image */}
        <img
          src={brandSrc}
          alt="Manuel Heller brand"
          width={320}
          height={320}
          style={{ width: 320, height: 320, objectFit: "contain" }}
        />
      </div>

      {/* Title + tagline — right column */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: 40,
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontStyle: "italic",
            lineHeight: 1,
            marginBottom: 24,
          }}
        >
          {t("title")}
        </div>
        <div style={{ fontSize: 28, lineHeight: 1.3, opacity: 0.7 }}>{t("description")}</div>
      </div>

      {/* Footer URL strip */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 80,
          fontSize: 22,
          fontFamily: "monospace",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          opacity: 0.55,
        }}
      >
        manuelheller.dev
      </div>
    </div>,
    { ...size },
  );
}
