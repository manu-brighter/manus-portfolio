import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

// Dynamic Twitter card image — 1200x600 paper-bg with the brand
// ink-splat upper-left and the localised title + tagline right-aligned.
// Twitter card aspect (2:1) is slightly squarer than OG (1.91:1).
// Pre-rendered at build-time per locale by Next.js metadata API.
//
// Note: Satori (the renderer behind next/og's ImageResponse) does NOT
// support SVG <text> nodes — the wordmark therefore lives in a real
// flex div stacked above the SVG via absolute positioning. Same gotcha
// as src/app/icon.tsx + src/app/apple-icon.tsx.

// Required for `output: "export"` static-export mode — Next 16 won't
// pre-render dynamic Twitter card routes without an explicit force-static.
export const dynamic = "force-static";
export const alt = "Manuel Heller — Craft Portfolio";
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function TwitterImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "meta" });

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
      {/* Brand mark — left column */}
      <div
        style={{
          width: 320,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <svg
          role="img"
          aria-label="MH"
          viewBox="0 0 64 64"
          width="280"
          height="280"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g style={{ mixBlendMode: "multiply" }}>
            <ellipse
              cx="22"
              cy="22"
              rx="20"
              ry="18"
              fill="#FF6BA0"
              opacity="0.85"
              transform="rotate(-12 22 22)"
            />
            <ellipse
              cx="42"
              cy="22"
              rx="18"
              ry="20"
              fill="#FFC474"
              opacity="0.85"
              transform="rotate(8 42 22)"
            />
            <ellipse
              cx="22"
              cy="42"
              rx="19"
              ry="18"
              fill="#7CE8C4"
              opacity="0.85"
              transform="rotate(15 22 42)"
            />
            <ellipse
              cx="42"
              cy="42"
              rx="20"
              ry="19"
              fill="#B89AFF"
              opacity="0.85"
              transform="rotate(-8 42 42)"
            />
          </g>
        </svg>
        {/* Wordmark via flex div — Satori does not support SVG <text> */}
        <div
          style={{
            position: "absolute",
            left: 80,
            top: 80,
            width: 320,
            height: 280,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "serif",
            fontStyle: "italic",
            fontSize: 160,
            color: "#0A0608",
          }}
        >
          MH
        </div>
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
