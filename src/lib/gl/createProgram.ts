/**
 * Shared GLSL ES 3.00 program-link helper. Colocated with `compileShader`
 * because the call path is always `compileShader(vert) + compileShader(frag)
 *  → createProgram(gl, vert, frag, label)`.
 *
 * Throws on link failure with the program info-log included in the
 * message. Callers that need a soft-failure path (mount effects that
 * should bail without crashing the page) wrap in try/catch — same
 * convention as `compileShader`.
 *
 * The attached shaders are deleted from the GL context after a
 * successful link: the program retains its compiled-bytecode copy,
 * and the shader objects themselves are no longer needed. Matches the
 * behaviour of the inline createProgram previously living in
 * `FluidOrchestrator`.
 */

export function createProgram(
  gl: WebGL2RenderingContext,
  vert: WebGLShader,
  frag: WebGLShader,
  label: string,
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error(`${label}: createProgram failed`);
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`${label}: link error: ${log}`);
  }
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  return program;
}
