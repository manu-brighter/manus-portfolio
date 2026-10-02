import { expect, test } from "@playwright/test";
import {
  createInkWarmup,
  isSlowInkWindow,
  parseInkPreference,
  resolveInkPreference,
} from "../../src/lib/inkPreview";

test("measurement waits for simulation warmup and settled initial assets", () => {
  const warmedUp = createInkWarmup(1000);
  expect(warmedUp(1000, false)).toBe(false);
  expect(warmedUp(6500, true)).toBe(false);
  expect(warmedUp(7000, true)).toBe(false);
  expect(warmedUp(8500, true)).toBe(true);
});

test("a stalled asset cannot block adaptation indefinitely", () => {
  const warmedUp = createInkWarmup(1000);
  expect(warmedUp(15999, false)).toBe(false);
  expect(warmedUp(16000, false)).toBe(true);
});

test("returning from a hidden tab gets a shorter observation grace period", () => {
  const warmedUp = createInkWarmup(1000, 2000);
  expect(warmedUp(1000, true)).toBe(false);
  expect(warmedUp(2999, true)).toBe(false);
  expect(warmedUp(3000, true)).toBe(true);
});

test("transient stalls do not mark an otherwise fluid window as slow", () => {
  expect(isSlowInkWindow([...Array(89).fill(16.7), 800])).toBe(false);
  expect(isSlowInkWindow(Array(89).fill(34))).toBe(false);
});

test("sustained missed frames and severe stalls qualify for reduction", () => {
  expect(isSlowInkWindow([...Array(60).fill(16.7), ...Array(30).fill(33.4)])).toBe(true);
  expect(isSlowInkWindow(Array(90).fill(300))).toBe(true);
  expect(isSlowInkWindow(Array(90).fill(16.7))).toBe(false);
});

test("only known modes are valid preferences", () => {
  expect(parseInkPreference(null)).toBeNull();
  expect(parseInkPreference("false")).toBeNull();
  expect(parseInkPreference("light")).toBe("light");
  expect(parseInkPreference("full")).toBe("full");
  expect(parseInkPreference("auto")).toBe("auto");
});

test("Auto is the default and a temporary URL overrides a valid saved preference", () => {
  expect(resolveInkPreference(null, null)).toBe("auto");
  expect(resolveInkPreference("invalid", "invalid")).toBe("auto");
  expect(resolveInkPreference(null, "full")).toBe("full");
  expect(resolveInkPreference("light", "full")).toBe("light");
  expect(resolveInkPreference("full", "light")).toBe("full");
  expect(resolveInkPreference("invalid", "light")).toBe("light");
});
