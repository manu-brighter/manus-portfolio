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
        // translateZ(0) + backfaceVisibility:hidden + will-change
        // pin it to its own layer that survives compositor work.
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
        willChange: "transform",
      }}
      aria-hidden="true"
      data-scene="root"
    >
      {children}
    </R3FCanvas>
  );
}
