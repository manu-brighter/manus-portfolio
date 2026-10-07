import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ease } from "@/lib/motion/tokens";

/**
 * The motion tokens as GSAP eases.
 *
 * GSAP does not read CSS `cubic-bezier(...)` strings: `gsap.parseEase`
 * returns undefined for them and the tween silently falls back to its
 * default `power1.out`. The bezier tokens therefore go through
 * CustomEase (ships inside the `gsap` package). CSS transitions keep
 * using the `cubic-bezier(...)` form; only GSAP needs this.
 *
 * Created lazily on first use, so importing the module costs nothing
 * during the server render.
 */

type Bezier = readonly [number, number, number, number];
type EaseFn = (progress: number) => number;

let cache: { riso: EaseFn; expo: EaseFn; fluidDrag: EaseFn } | null = null;

const toPath = ([x1, y1, x2, y2]: Bezier) => `M0,0 C${x1},${y1} ${x2},${y2} 1,1`;

export function gsapEase() {
  if (!cache) {
    gsap.registerPlugin(CustomEase);
    cache = {
      riso: CustomEase.create("token-riso", toPath(ease.riso)),
      expo: CustomEase.create("token-expo", toPath(ease.expo)),
      fluidDrag: CustomEase.create("token-fluid-drag", toPath(ease.fluidDrag)),
    };
  }
  return cache;
}
