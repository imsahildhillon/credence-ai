'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { createReusableWebglRenderer } from './createReusableWebglRenderer';
import { resolveThemeColorRgb } from './resolveThemeColor';

const BREATHE_PERIOD_SECONDS = 40;
const BREATHE_MIN = 0.7;
const BREATHE_MAX = 1;
const GLOW_CENTER_X = 0.5;
const GLOW_CENTER_Y = -0.2;
const GLOW_RADIUS = 1.2;
const GLOW_PEAK_ALPHA = 0.18;

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 vUv;
  uniform vec3 uGlowColor;
  uniform float uBreathe;

  void main() {
    float d = distance(vUv, vec2(${GLOW_CENTER_X}, ${GLOW_CENTER_Y}));
    float glow = smoothstep(${GLOW_RADIUS}, 0.0, d);
    gl_FragColor = vec4(uGlowColor, glow * uBreathe * ${GLOW_PEAK_ALPHA});
  }
`;

/**
 * The Hero's ambient background — a real WebGL fragment shader reproducing
 * the original design's breathing radial glow (40s cycle, bottom-anchored),
 * via three.js. This replaces the CSS-gradient approximation used earlier
 * in this migration, now that the actual reference shader is available to
 * reproduce faithfully rather than approximate.
 *
 * The glow color is resolved from the `--brand-primary` design token at
 * runtime (`resolveThemeColorRgb` against this element's own `text-primary`
 * class) rather than hardcoded — CLAUDE.md §12 confines raw color values to
 * the token files, and this keeps the shader theme-aware for free.
 *
 * Progressive enhancement: `HeroSection.module.css`'s `.heroGlow` CSS
 * gradient stays mounted behind this canvas (see `HeroSection.tsx`), so a
 * JS-disabled visitor, or a WebGL-context failure, still sees an ambient
 * glow — this canvas is a pure visual upgrade layered on top, never a
 * dependency the page requires to render.
 */
export function HeroShaderBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) {
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = createReusableWebglRenderer(canvas, {
        alpha: true,
        antialias: false,
        powerPreference: 'low-power',
      });
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const geometry = new THREE.PlaneGeometry(2, 2);
    const [r, g, b] = resolveThemeColorRgb(container);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const breatheUniform = { value: (BREATHE_MIN + BREATHE_MAX) / 2 };
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      uniforms: {
        uGlowColor: { value: new THREE.Vector3(r, g, b) },
        uBreathe: breatheUniform,
      },
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const resize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(rect.width, rect.height, false);
    };
    resize();

    const cleanup = () => {
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };

    if (prefersReducedMotion) {
      renderer.render(scene, camera);
      return cleanup;
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    let animationFrame = 0;
    let cancelled = false;
    const startTime = performance.now();

    const step = (time: number) => {
      if (cancelled) {
        return;
      }
      const elapsedSeconds = (time - startTime) / 1000;
      const cyclePosition = (elapsedSeconds / BREATHE_PERIOD_SECONDS) * Math.PI * 2;
      const amplitude = (BREATHE_MAX - BREATHE_MIN) / 2;
      breatheUniform.value = BREATHE_MIN + amplitude - amplitude * Math.cos(cyclePosition);
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(step);
    };
    animationFrame = requestAnimationFrame(step);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      cleanup();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="text-primary pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
