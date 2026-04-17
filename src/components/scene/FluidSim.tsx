"use client";

import { type ThreeEvent, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { TierConfig } from "@/lib/gpu";
import { subscribe } from "@/lib/raf";
import { FluidOrchestrator, type PointerState } from "./FluidOrchestrator";

type GLProps = { get: (o: object) => Record<string, unknown> };

function patchTexture(renderer: THREE.WebGLRenderer, tex: THREE.Texture, glTex: WebGLTexture) {
  const props = (renderer as unknown as { properties: GLProps }).properties.get(tex);
  props.__webglTexture = glTex;
  props.__webglInit = true;
}

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
  const measuringRef = useRef(measuring);
  measuringRef.current = measuring;
  const onFrametimeRef = useRef(onFrametime);
  onFrametimeRef.current = onFrametime;
  const prevConfigRef = useRef<TierConfig | null>(null);

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
    orchestrator.init(context, config);
    orchestratorRef.current = orchestrator;
    prevConfigRef.current = config;

    patchTexture(gl, outputTexture, orchestrator.getOutputTexture());

    return () => {
      orchestrator.dispose();
      orchestratorRef.current = null;
      prevConfigRef.current = null;
    };
  }, [gl, onGLReady, outputTexture, config]);

  useEffect(() => {
    const orchestrator = orchestratorRef.current;
    if (!orchestrator || config === prevConfigRef.current) return;

    const context = gl.getContext() as WebGL2RenderingContext;
    orchestrator.dispose();
    orchestrator.init(context, config);
    prevConfigRef.current = config;

    patchTexture(gl, outputTexture, orchestrator.getOutputTexture());
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

      if (measuringRef.current) {
        const gl2 = gl.getContext() as WebGL2RenderingContext;
        gl2.finish();
        onFrametimeRef.current(performance.now() - t0);
      }

      pointerRef.current.dx = 0;
      pointerRef.current.dy = 0;
      pointerRef.current.moved = false;
    }, 15);
  }, [gl]);

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
