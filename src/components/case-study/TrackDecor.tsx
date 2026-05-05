import type { ReactNode } from "react";

/**
 * TrackDecor — between-station decoration item on the horizontal track.
 *
 * Renders a fixed-width flex-item that slots between StationFrames in
 * the StationContainer track. Holds 1-3 cliparts / ink-splats / etc.
 * that scroll horizontally with the rest of the case-study content.
 *
 * Width is in vw so the decoration scales with viewport. Vertical
 * position can be offset via offsetYVh for the "scattered table" feel.
 */

type Props = {
  /** Width in vw. */
  widthVw: number;
  /** Vertical offset in vh. Default 0. */
  offsetYVh?: number;
  /** Decoration content (cliparts, ink-splats, etc.). */
  children: ReactNode;
};

export function TrackDecor({ widthVw, offsetYVh = 0, children }: Props) {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-screen flex-shrink-0 items-center justify-center"
      style={{
        width: `${widthVw}vw`,
        transform: `translateY(${offsetYVh}vh)`,
      }}
    >
      {children}
    </div>
  );
}
