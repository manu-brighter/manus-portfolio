import { ImageResponse } from "next/og";

// Browser tab favicon — 32x32 transparent PNG generated at request-time
// from inline SVG ellipses + a flex-overlaid "MH" wordmark. Transparent
// background because tabs have their own rendering context (light/dark
// theme) and would clip a paper-bg poorly.
//
// Note: Satori (the renderer behind next/og's ImageResponse) does NOT
// support SVG <text> nodes — the wordmark therefore lives in a real
// flex div stacked above the SVG via absolute positioning.

// Required for `output: "export"` static-export mode — Next 16 won't
// pre-render dynamic icon routes without an explicit force-static.
export const dynamic = "force-static";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        position: "relative",
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
      }}
    >
      <svg
        role="img"
        aria-label="MH"
        viewBox="0 0 64 64"
        width="32"
        height="32"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "absolute", inset: 0 }}
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
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "serif",
          fontStyle: "italic",
          fontSize: 18,
          fontWeight: 600,
          color: "#0A0608",
          lineHeight: 1,
        }}
      >
        MH
      </div>
    </div>,
    { ...size },
  );
}
