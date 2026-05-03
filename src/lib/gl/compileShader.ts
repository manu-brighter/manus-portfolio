/**
 * Shared GLSL ES 3.00 shader compile helper.
 *
 * Prior to extraction this logic was duplicated across PhotoInkMask,
 * InkWipeOverlay, and TextStamper — only PhotoInkMask handled the
 * leading-whitespace-before-`#version` trap that CLAUDE.md Phase 9
 * documents (Turbopack raw-loader / HMR cache slips can deliver a
 * stray newline before the directive, and GLSL ES 3.00 rejects any
 * source whose `#version` isn't the literal first line).
 *
 * Single helper, one place to update if the trap recurs. Throws on
 * compile failure — callers that need a soft failure path (e.g. mount
 * effects that should bail without crashing the page) wrap in try/catch.
 */

const VERSION_HEADER = "#version 300 es";

export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  src: string,
  label: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error(`${label}: createShader failed`);

  // Strip BOM, leading whitespace, and any pre-existing `#version`
  // directive; re-prepend a known-good one so the directive is always
  // line 1 byte 0.
  const stripped = src.replace(/^[\s﻿]*#version[^\n]*\r?\n?/m, "");
  gl.shaderSource(shader, `${VERSION_HEADER}\n${stripped}`);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`${label}: compile error: ${log}`);
  }
  return shader;
}
