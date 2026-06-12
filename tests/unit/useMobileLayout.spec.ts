// tests/unit/useMobileLayout.spec.ts
import { expect, test } from "@playwright/test";
import { isMobileLayout } from "@/hooks/useMobileLayout";

/**
 * Pure-function coverage for the Mobile-layout derivation.
 *
 * Hook usage (`useMobileLayout`) needs a React renderer and a `window`,
 * so it's covered indirectly via E2E specs (hero-sim-mobile,
 * photography-swiper, case-study-scrolly-mobile). The pure derivation
 * is what locks down the rule.
 */

test.describe("isMobileLayout (pure derivation)", () => {
  test("coarse pointer + viewport < 768 → true", () => {
    expect(isMobileLayout({ coarse: true, width: 375 })).toBe(true);
    expect(isMobileLayout({ coarse: true, width: 767 })).toBe(true);
  });

  test("coarse pointer + viewport ≥ 768 (tablet) → false", () => {
    expect(isMobileLayout({ coarse: true, width: 768 })).toBe(false);
    expect(isMobileLayout({ coarse: true, width: 1024 })).toBe(false);
  });

  test("fine pointer + small viewport (DevTools desktop emulation) → false", () => {
    expect(isMobileLayout({ coarse: false, width: 375 })).toBe(false);
  });

  test("fine pointer + desktop viewport → false", () => {
    expect(isMobileLayout({ coarse: false, width: 1440 })).toBe(false);
  });
});
