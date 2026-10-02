"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { useScene } from "@/components/scene/SceneProvider";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePathname } from "@/i18n/navigation";
import { getSimPreset, SIM_PRESETS, type SimPreset } from "@/lib/content/simPresets";
import { subscribeToLoaderComplete } from "@/lib/loaderSession";
import { SPOT_HEX } from "@/lib/palette";
import { useSimPresetStore } from "@/lib/simPresetStore";
import { InkPreviewPanel } from "./InkPreviewPanel";
import styles from "./SimPresetSwitcher.module.css";
import { SimPresetSwitcherHint } from "./SimPresetSwitcherHint";

/** Also used by the experiments' inline theme controls. */
export function swatchGradient(preset: SimPreset): string {
  const [c0, c1] = preset.swatchHex ?? [SPOT_HEX[preset.swatch[0]], SPOT_HEX[preset.swatch[1]]];
  return `linear-gradient(135deg, ${c0} 50%, ${c1} 50%)`;
}

export function SimPresetSwitcher() {
  const t = useTranslations("simPresets");
  const studio = useTranslations("inkStudio");
  const { automaticallyReduced } = useScene();
  const pathname = usePathname();
  const presetId = useSimPresetStore((s) => s.presetId);
  const setPreset = useSimPresetStore((s) => s.setPreset);
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [notice, setNotice] = useState(false);
  const [hint, setHint] = useState(false);
  const reducedMotion = useReducedMotion();
  const notified = useRef(false);
  const container = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (pathname !== "/" || reducedMotion || expanded) return;
    try {
      if (sessionStorage.getItem("manus-studio-hint-shown") === "1") return;
    } catch {
      // The bounded hint can still run when site storage is blocked.
    }
    let hideTimer: number | undefined;
    let showTimer: number | undefined;
    const unsubscribe = subscribeToLoaderComplete(() => {
      showTimer = window.setTimeout(() => {
        if (window.scrollY > 100) return;
        setHint(true);
        try {
          sessionStorage.setItem("manus-studio-hint-shown", "1");
        } catch {
          // No persistence required for the current visit.
        }
        hideTimer = window.setTimeout(() => setHint(false), 5500);
      }, 1200);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      setHint(false);
    };
  }, [pathname, reducedMotion, expanded]);

  useEffect(() => {
    if (!automaticallyReduced || notified.current) return;
    notified.current = true;
    setNotice(true);
    const timer = window.setTimeout(() => setNotice(false), 9000);
    return () => window.clearTimeout(timer);
  }, [automaticallyReduced]);

  useEffect(() => {
    if (!expanded) return;
    const dismiss = (event: PointerEvent) => {
      if (container.current?.contains(event.target as Node)) return;
      // Restore only if dismissal would otherwise remove the focused control.
      if (container.current?.contains(document.activeElement)) toggle.current?.focus();
      setExpanded(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setExpanded(false);
      toggle.current?.focus();
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", onEscape);
    };
  }, [expanded]);

  // Experiments provide their own controls; the background is paused there.
  if (!mounted || pathname.startsWith("/playground/")) return null;

  return (
    <div
      ref={container}
      data-no-splat
      data-testid="ink-studio"
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex flex-col items-end gap-3 text-ink print:hidden md:right-auto md:bottom-5 md:left-5 md:items-start"
    >
      {notice && !expanded && (
        <div
          role="status"
          className="max-w-64 border border-ink/20 bg-paper px-3 py-2 text-xs leading-relaxed shadow-[3px_3px_0_var(--color-paper-shade)]"
        >
          {studio("reducedNotice")}
        </div>
      )}
      {!reducedMotion && <SimPresetSwitcherHint active={hint && !expanded} />}
      <button
        ref={toggle}
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => {
          setExpanded((value) => !value);
          setNotice(false);
        }}
        className="order-last flex min-h-11 items-center gap-2.5 rounded-full border border-ink/30 bg-paper px-4 py-2 font-mono text-xs shadow-[3px_3px_0_var(--color-paper-shade)] transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none"
      >
        <span
          aria-hidden="true"
          className="size-4 rounded-full border border-ink/20"
          style={{ background: swatchGradient(getSimPreset(presetId)) }}
        />
        {studio("label")}
        <span
          aria-hidden="true"
          className="ml-1 transition-transform duration-200 motion-reduce:transition-none"
          style={{ transform: expanded ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          +
        </span>
      </button>
      <div
        id={panelId}
        data-testid="ink-studio-panel"
        data-open={expanded}
        aria-hidden={!expanded}
        inert={!expanded}
        className={`${styles.panel} max-h-[calc(100dvh-7rem)] w-[min(21rem,calc(100vw-2rem))] overflow-y-auto rounded-sm border border-ink/30 bg-paper p-5 shadow-[5px_5px_0_var(--color-paper-shade)]`}
      >
        <p className="mb-1 font-display text-2xl">{studio("label")}</p>
        <p className="mb-4 text-xs leading-relaxed text-ink-muted">{studio("intro")}</p>
        <fieldset className="mb-4">
          <legend className="mb-2 font-mono text-[0.65rem] uppercase tracking-widest">
            {studio("theme")}
          </legend>
          <div className="grid grid-cols-2 gap-1">
            {SIM_PRESETS.map((preset) => (
              <label
                key={preset.id}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-2 has-checked:bg-paper-shade"
              >
                <input
                  type="radio"
                  name="sim-preset"
                  value={preset.id}
                  checked={presetId === preset.id}
                  onChange={() => setPreset(preset.id)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className="size-5 shrink-0 rounded-full border border-ink/30 peer-checked:ring-1 peer-checked:ring-ink peer-checked:ring-offset-2 peer-checked:ring-offset-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-(--focus-ring)"
                  style={{ background: swatchGradient(preset) }}
                />
                <span className="text-xs">{t(preset.i18nKey)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <InkPreviewPanel />
      </div>
    </div>
  );
}
