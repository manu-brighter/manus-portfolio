"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { dispatchSplat } from "@/lib/fluidBus";
import { SPOT_HEX, type SpotColor } from "@/lib/palette";
import { subscribeToPrintJam } from "@/lib/printJamBus";

/**
 * PrintJamOverlay — the "Fehldruck" easter egg.
 *
 * Triggers: the Konami code (via document keydown, `e.code` so QWERTZ
 * works) or `manus.fehldruck()` from the console menu (printJamBus).
 *
 * Sequence (~6s): `<html data-print-jam>` slips the registration on
 * all display text (channel-split shadows + jitter, CSS in
 * globals.css), a rotated reject-stamp "FEHLDRUCK · REGISTRATION
 * ERROR" appears, and the sim takes a splat storm via fluidBus. Then
 * the jam releases: attribute off, stamp swaps to "NEU KALIBRIERT",
 * fades out. Re-triggers are ignored while a run is active.
 *
 * Reduced-motion: no jitter attribute, no splat storm, no transitions
 * — the stamp simply shows for a beat and disappears. The egg still
 * "answers" the code without breaking the no-motion contract.
 *
 * A11y: the overlay is decorative (aria-hidden, pointer-events-none);
 * keyboard listener ignores form fields so typing "ba" in the contact
 * form can't complete the code.
 */

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "KeyB",
  "KeyA",
] as const;

const JAM_MS = 4200;
const CALIBRATED_MS = 1800;
const REDUCED_STAMP_MS = 2000;
const SPLAT_EVERY_MS = 110;
const SPLAT_UNTIL_MS = 3000;
const SPOTS: readonly SpotColor[] = ["rose", "amber", "mint", "violet"];

type Phase = "idle" | "jam" | "calibrated";

export function PrintJamOverlay() {
  const t = useTranslations("easterEgg");
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;
  const timersRef = useRef<number[]>([]);
  const splatIntervalRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  useEffect(() => {
    const clearAll = () => {
      for (const id of timersRef.current) window.clearTimeout(id);
      timersRef.current = [];
      if (splatIntervalRef.current !== null) {
        window.clearInterval(splatIntervalRef.current);
        splatIntervalRef.current = null;
      }
    };

    const run = () => {
      if (phaseRef.current !== "idle") return;

      if (reducedMotionRef.current) {
        setPhase("jam");
        timersRef.current.push(window.setTimeout(() => setPhase("idle"), REDUCED_STAMP_MS));
        return;
      }

      setPhase("jam");
      document.documentElement.setAttribute("data-print-jam", "");
      splatIntervalRef.current = window.setInterval(() => {
        dispatchSplat({
          x: 0.1 + Math.random() * 0.8,
          y: 0.1 + Math.random() * 0.8,
          color: SPOTS[Math.floor(Math.random() * SPOTS.length)] as SpotColor,
          dx: (Math.random() - 0.5) * 1.6,
          dy: (Math.random() - 0.5) * 1.6,
        });
      }, SPLAT_EVERY_MS);
      timersRef.current.push(
        window.setTimeout(() => {
          if (splatIntervalRef.current !== null) {
            window.clearInterval(splatIntervalRef.current);
            splatIntervalRef.current = null;
          }
        }, SPLAT_UNTIL_MS),
        window.setTimeout(() => {
          document.documentElement.removeAttribute("data-print-jam");
          setPhase("calibrated");
        }, JAM_MS),
        window.setTimeout(() => setPhase("idle"), JAM_MS + CALIBRATED_MS),
      );
    };

    let progress = 0;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        progress = 0;
        return;
      }
      if (e.code === KONAMI[progress]) {
        progress++;
        if (progress === KONAMI.length) {
          progress = 0;
          run();
        }
      } else {
        // A wrong key can still be the sequence START (e.g. Up Up Up
        // Down...) — re-check against index 0 instead of hard reset.
        progress = e.code === KONAMI[0] ? 1 : 0;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const unsub = subscribeToPrintJam(run);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unsub();
      clearAll();
      document.documentElement.removeAttribute("data-print-jam");
    };
  }, []);

  if (phase === "idle") return null;

  const jam = phase === "jam";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center"
    >
      <div
        className={`rotate-[-7deg] border-[3px] bg-paper px-6 py-3 font-mono text-sm tracking-[0.2em] uppercase shadow-[6px_6px_0_rgba(10,6,8,0.25)] md:px-10 md:py-4 md:text-xl ${
          jam ? "print-jam-stamp-jam" : "print-jam-stamp-ok"
        }`}
        style={{
          borderColor: jam ? SPOT_HEX.rose : SPOT_HEX.mint,
          color: "var(--color-ink)",
        }}
      >
        {jam ? t("jamStamp") : t("calibratedStamp")}
      </div>
    </div>
  );
}
