"use client";

import { Canvas as R3FCanvas, useThree } from "@react-three/fiber";
import { type ReactNode, useEffect } from "react";
import { subscribe } from "@/lib/raf";

function RafBridge() {
  const { advance } = useThree();

  useEffect(() => {
    return subscribe((_deltaMs, elapsedMs) => {
      advance(elapsedMs);
    }, 20);
  }, [advance]);

  return null;
}

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
    >
      <RafBridge />
      {children}
    </R3FCanvas>
  );
}
