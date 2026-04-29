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
        preserveDrawingBuffer: false,
      }}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        touchAction: "none",
      }}
      aria-hidden="true"
      data-scene="root"
    >
      {children}
    </R3FCanvas>
  );
}
