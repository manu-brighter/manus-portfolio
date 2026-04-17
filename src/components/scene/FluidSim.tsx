"use client";

import { type ThreeEvent, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { TierConfig } from "@/lib/gpu";
import { subscribe } from "@/lib/raf";
import { FluidOrchestrator, type PointerState } from "./FluidOrchestrator";

type FluidSimProps = {
  config: TierConfig;
  measuring: boolean;
  onGLReady: (gl: WebGL2RenderingContext) => void;
  onFrametime: (ms: number) => void;
};

export function FluidSim({ config, measuring, onGLReady, onFrametime }: FluidSimProps) {
  const { gl, size } = useThree();

  const orchestratorRef = useRef<FluidOrchestrator | null>(null);
  const pointerRef = useRef<PointerState>({
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    down: false,
    moved: false,
  });
  const configRef = useRef(config);
  configRef.current = config;

  const outputTexture = useMemo(() => {
    const tex = new THREE.Texture();
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }, []);

  useEffect(() => {
    const context = gl.getContext() as WebGL2RenderingContext;
    if (!context || !(context instanceof WebGL2RenderingContext)) return;

    onGLReady(context);

    const orchestrator = new FluidOrchestrator();
    orchestrator.init(context, configRef.current);
    orchestratorRef.current = orchestrator;

    const props = (
      gl as unknown as { properties: { get: (o: object) => Record<string, unknown> } }
    ).properties.get(outputTexture);
    props.__webglTexture = orchestrator.getOutputTexture();
    props.__webglInit = true;

    return () => {
      orchestrator.dispose();
      orchestratorRef.current = null;
    };
  }, [gl, onGLReady, outputTexture]);

  useEffect(() => {
    const orchestrator = orchestratorRef.current;
    if (!orchestrator) return;

    const context = gl.getContext() as WebGL2RenderingContext;
    orchestrator.dispose();
    orchestrator.init(context, config);

    const props = (
      gl as unknown as { properties: { get: (o: object) => Record<string, unknown> } }
    ).properties.get(outputTexture);
    props.__webglTexture = orchestrator.getOutputTexture();
    props.__webglInit = true;
  }, [config, gl, outputTexture]);

  useEffect(() => {
    const dpr = gl.getPixelRatio();
    orchestratorRef.current?.resize(Math.floor(size.width * dpr), Math.floor(size.height * dpr));
  }, [size, gl]);

  useEffect(() => {
    return subscribe((deltaMs, elapsedMs) => {
      const orchestrator = orchestratorRef.current;
      if (!orchestrator) return;

      const dt = Math.min(deltaMs * 0.001, 0.033);

      const t0 = performance.now();

      orchestrator.step(dt, elapsedMs, pointerRef.current);

      if (measuring) {
        const gl2 = gl.getContext() as WebGL2RenderingContext;
        gl2.finish();
        onFrametime(performance.now() - t0);
      }

      pointerRef.current.dx = 0;
      pointerRef.current.dy = 0;
      pointerRef.current.moved = false;
    }, 15);
  }, [gl, measuring, onFrametime]);

  const onPointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const event = e.nativeEvent;
      const rect = gl.domElement.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = 1.0 - (event.clientY - rect.top) / rect.height;

      pointerRef.current.dx = x - pointerRef.current.x;
      pointerRef.current.dy = y - pointerRef.current.y;
      pointerRef.current.x = x;
      pointerRef.current.y = y;
      pointerRef.current.moved = true;
    },
    [gl],
  );

  const onPointerDown = useCallback(() => {
    pointerRef.current.down = true;
  }, []);

  const onPointerUp = useCallback(() => {
    pointerRef.current.down = false;
  }, []);

  useEffect(() => {
    const hero = document.getElementById("hero-heading")?.closest("section");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          orchestratorRef.current?.resume();
        } else {
          orchestratorRef.current?.pause();
        }
      },
      { threshold: 0 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <mesh onPointerMove={onPointerMove} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial map={outputTexture} depthTest={false} depthWrite={false} />
    </mesh>
  );
}
