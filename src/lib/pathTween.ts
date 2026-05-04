/**
 * Manual SVG `d`-attribute interpolator. Avoids the paid GSAP morphSVG plugin.
 *
 * Constraints: input paths must have the same point-count and the same
 * command sequence (M, L, Q, C). The interpolator parses each command's
 * coordinates, lerps pair-wise, and re-emits the path string.
 *
 * Use case: Case Study per-station ink-akzent. Each station has 4-5
 * keyframe paths (blob → rectangle), all hand-authored to match.
 */

type Cmd = { type: string; coords: number[] };

const CMD_RE = /([MLQCmlqc])\s*([-\d.,\s]*)/g;

function parsePath(d: string): Cmd[] {
  const cmds: Cmd[] = [];
  let m: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: classic regex-iter pattern
  while ((m = CMD_RE.exec(d)) !== null) {
    const type = m[1] ?? "";
    const coordsStr = (m[2] ?? "").trim();
    if (!coordsStr) {
      cmds.push({ type, coords: [] });
      continue;
    }
    const coords = coordsStr
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => !Number.isNaN(n));
    cmds.push({ type, coords });
  }
  return cmds;
}

function emitPath(cmds: Cmd[]): string {
  return cmds
    .map((c) => {
      if (c.coords.length === 0) return c.type;
      const coords = c.coords.map((n) => Number(n.toFixed(2)).toString()).join(" ");
      return `${c.type} ${coords}`;
    })
    .join(" ");
}

/**
 * Linear interpolate between two paths. `t` is 0..1.
 *
 * Throws if the paths are not point-compatible (different command sequence
 * or different coord count per command).
 */
export function lerpPath(a: string, b: string, t: number): string {
  const ca = parsePath(a);
  const cb = parsePath(b);
  if (ca.length !== cb.length) {
    throw new Error(`pathTween: command count mismatch (${ca.length} vs ${cb.length})`);
  }
  const out: Cmd[] = ca.map((cmdA, i) => {
    const cmdB = cb[i];
    if (!cmdB) throw new Error(`pathTween: missing command at index ${i}`);
    if (cmdA.type !== cmdB.type) {
      throw new Error(`pathTween: command type mismatch at ${i}: ${cmdA.type} vs ${cmdB.type}`);
    }
    if (cmdA.coords.length !== cmdB.coords.length) {
      throw new Error(`pathTween: coord count mismatch at command ${i}`);
    }
    const coords = cmdA.coords.map((va, j) => {
      const vb = cmdB.coords[j];
      return vb === undefined ? va : va + (vb - va) * t;
    });
    return { type: cmdA.type, coords };
  });
  return emitPath(out);
}
