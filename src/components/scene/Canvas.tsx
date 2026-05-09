"use client";

import { Canvas as R3FCanvas } from "@react-three/fiber";
import type { ReactNode } from "react";

type SceneCanvasProps = {
  children: ReactNode;
};

export function SceneCanvas({ children }: SceneCanvasProps) {
  return (
    <R3FCanvas
      frameloop="never"
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
        // Preserve the drawing buffer so the canvas keeps its last
        // frame visible during iOS Safari's momentum-scroll repaint
        // pauses. Without this, the buffer can be cleared mid-scroll
        // and the user sees the fluid sim "disappear and reappear"
        // as the compositor lags behind. Cost is a minor browser
        // optimisation lockout — acceptable for the visual stability.
        preserveDrawingBuffer: true,
      }}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        touchAction: "none",
        // Force a dedicated GPU compositor layer for the canvas. iOS
        // Safari otherwise sometimes hides position:fixed children
        // during momentum scroll while it adjusts the layer tree —
        // the canvas blinks in/out for the duration of the scroll.
        // `translateZ(0)` alone promotes the layer; the previous extra
        // `will-change: transform` was redundant and added permanent
        // VRAM cost for the canvas-sized compositor texture (review
        // feedback). If the blink returns on a future iOS version,
        // re-add `willChange: "transform"` here as the load-bearing
        // hint — the rest of this comment explains why we'd want it.
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
      }}
      aria-hidden="true"
      data-scene="root"
    >
      {children}
    </R3FCanvas>
  );
}
