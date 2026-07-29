import * as THREE from 'three';

/**
 * A `<canvas>` element can only ever bind one WebGL context for its
 * lifetime. React's Strict Mode double-invokes effects in development
 * (mount → cleanup → mount) without recreating the underlying DOM node, so
 * a naive `new THREE.WebGLRenderer({ canvas })` on the second mount tries
 * to create a second context on the same canvas and fails — silently: no
 * exception is thrown, the renderer is just non-functional from then on.
 *
 * Requesting the context ourselves first and handing it to three.js via
 * the `context` option sidesteps this: if one already exists (the
 * Strict-Mode-remount case), the browser hands back that same live
 * context instead of erroring, and three.js reuses it.
 */
export function createReusableWebglRenderer(
  canvas: HTMLCanvasElement,
  params: Omit<THREE.WebGLRendererParameters, 'canvas' | 'context'>,
): THREE.WebGLRenderer {
  const existingContext =
    (canvas.getContext('webgl2') as WebGLRenderingContext | null) ??
    (canvas.getContext('webgl') as WebGLRenderingContext | null) ??
    undefined;

  return new THREE.WebGLRenderer({ ...params, canvas, context: existingContext });
}
