import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

/**
 * Shared OG / Twitter card renderer. Both the 1200x630 OG image and the
 * 1200x600 Twitter image use byte-identical layout: paper-bg, brand
 * PNG left column, title + tagline right column, footer URL strip.
 * Extracting the shared JSX + brand-PNG fetch into one helper means a
 * design tweak only happens in one place (the previous duplicated
 * files drifted at least once already).
 *
 * Route files keep their own `dynamic`, `alt`, `contentType`,
 * `generateStaticParams` exports (Next.js metadata route convention).
 */

async function getBrandImageDataUrl(): Promise<string> {
  // Trimmed transparent variant — composited cleanly onto the card's
  // paper-bg without producing a paper-on-paper rectangle around the drop.
  const filePath = path.join(process.cwd(), "public", "brand", "icon-source-transparent.png");
  const buffer = await readFile(filePath);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export async function renderSocialCard({
  locale,
  width,
  height,
}: {
  locale: string;
  width: number;
  height: number;
}): Promise<ImageResponse> {
  const t = await getTranslations({ locale, namespace: "meta" });
  const brandSrc = await getBrandImageDataUrl();

  return new ImageResponse(
    <div
      style={{
        position: "relative",
        width,
        height,
        display: "flex",
        background: "#f0e8dc", // --color-paper
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
    { width, height },
  );
}
