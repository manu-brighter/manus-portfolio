"use client";

import { useEffect, useId, useState } from "react";
import { getSimPreset } from "@/lib/content/simPresets";
import { SPOT_RGB, type SpotColor } from "@/lib/palette";
import { useSimPresetStore } from "@/lib/simPresetStore";
import styles from "./PhotoInkAnimation.module.css";

const APERTURE_PATH =
  "M 51 8 C 65 2 78 16 81 27 C 98 30 98 48 88 59 C 94 74 74 87 62 85 C 48 100 31 87 27 77 C 9 79 1 59 13 47 C 4 31 20 17 32 20 C 35 9 43 6 51 8 Z";
const SPOT_SLOT = { mint: 0, amber: 1, rose: 2, violet: 3 } as const;

type Props = { spotColor: SpotColor; reveal: boolean; className?: string; onComplete?: () => void };

/** Parent gates motion/graphics availability and supplies the one-shot trigger.
 * No context allocation, pointer listener, observer or animation ticker. */
export function PhotoInkAnimation({ spotColor, className, reveal, onComplete }: Props) {
  const maskId = useId();
  const presetId = useSimPresetStore((state) => state.presetId);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (settled) onComplete?.();
  }, [settled, onComplete]);
  const ink = getSimPreset(presetId).visuals.ladder?.[SPOT_SLOT[spotColor]] ?? SPOT_RGB[spotColor];
  const stroke = `rgb(${ink.map((channel) => Math.round(channel * 255)).join(" ")})`;

  useEffect(() => {
    if (!reveal || settled) return;
    // Release even when a background tab or user stylesheet suppresses events.
    const timer = window.setTimeout(() => setSettled(true), 850);
    return () => window.clearTimeout(timer);
  }, [reveal, settled]);

  if (settled) return null;
  return (
    <div
      aria-hidden="true"
      data-testid="photo-ink-animation"
      data-revealing={reveal}
      className={`${styles.overlay} ${reveal ? styles.running : ""} ${className ?? ""}`}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setSettled(true);
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className={styles.sheet}
      >
        <defs>
          <mask
            id={maskId}
            x="0"
            y="0"
            width="100"
            height="100"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "luminance" }}
          >
            <rect width="100" height="100" fill="white" />
            <path d={APERTURE_PATH} fill="black" className={styles.aperture} />
          </mask>
        </defs>
        <rect width="100" height="100" fill="var(--color-paper)" mask={`url(#${maskId})`} />
        <path
          d={APERTURE_PATH}
          fill="none"
          stroke={stroke}
          strokeWidth="0.65"
          opacity="0.4"
          className={styles.aperture}
        />
      </svg>
    </div>
  );
}
