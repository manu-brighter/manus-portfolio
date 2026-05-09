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
        // Aggressive layer-promotion stack to keep iOS Safari from
        // culling the canvas during momentum scroll. Plain translateZ +
        // backface-visibility weren't enough in real-device testing —
        // fast scroll-direction-changes still triggered the cull.
        // Layered defenses:
        //   - translateZ(0): promotes a dedicated GPU compositor layer
        //   - backface-visibility:hidden: extra layer hint
        //   - will-change:transform: tells the browser this layer is
        //     critical, don't drop it (some VRAM cost is the trade-off)
        //   - contain:paint: paint-isolation, layer can't escape its
        //     own bounds, compositor treats it as self-contained
        //   - isolation:isolate: forms a stacking context, additional
        //     compositor anchor
        // Combined with FluidSim's scroll-pause (skip step() during
        // active scroll), this stops the blink. preserveDrawingBuffer
        // keeps the last frame visible while sim is paused.
        transform: "translateZ(0)",
        backfaceVisibility: "hidden",
        willChange: "transform",
        contain: "paint",
        isolation: "isolate",
      }}
      aria-hidden="true"
      data-scene="root"
    >
      {children}
    </R3FCanvas>
  );
}
