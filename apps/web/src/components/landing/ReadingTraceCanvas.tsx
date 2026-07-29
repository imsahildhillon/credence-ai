'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { createReusableWebglRenderer } from './createReusableWebglRenderer';
import { resolveThemeColorRgb } from './resolveThemeColor';

interface TracePoint {
  x: number;
  y: number;
  opacity: number;
  glow: boolean;
}

const MAX_TRACKED_POINTS = 2400;
const SCROLL_SPEED_PX_PER_SECOND = 24;
const GLOW_POINT_SIZE_PX = 7;

const LINE_VERTEX_SHADER = `
  attribute vec4 aColor;
  varying vec4 vColor;
  void main() {
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const LINE_FRAGMENT_SHADER = `
  precision highp float;
  varying vec4 vColor;
  void main() {
    gl_FragColor = vColor;
  }
`;

const GLOW_VERTEX_SHADER = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = ${GLOW_POINT_SIZE_PX.toFixed(1)};
  }
`;

const GLOW_FRAGMENT_SHADER = `
  precision highp float;
  uniform vec3 uColor;
  uniform float uAlpha;
  void main() {
    vec2 fromCenter = gl_PointCoord - vec2(0.5);
    float d = length(fromCenter) * 2.0;
    float falloff = smoothstep(1.0, 0.0, d);
    gl_FragColor = vec4(uColor, falloff * uAlpha);
  }
`;

/**
 * The hero's centerpiece — an abstracted "reading trace": a line that
 * wanders, occasionally oscillates (evoking a complex artifact), and
 * periodically pauses with a glowing dwell point — the visual language of
 * attention moving across a body of work. Purely decorative: it never
 * renders repository names, commit messages, or any other claim about
 * real data.
 *
 * Rendered via three.js — a vertex-colored `Line` plus a soft glow
 * `Points` object, both raw `ShaderMaterial`s — rather than Canvas2D. The
 * point-generation physics (wander/oscillate/pause phases) are unchanged
 * from the prior Canvas2D implementation; only the rendering backend
 * changed, to genuinely use WebGL/three.js rather than approximate it.
 *
 * Respects `prefers-reduced-motion`: renders one static, gently curved
 * line instead of animating.
 */
export function ReadingTraceCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = createReusableWebglRenderer(canvas, { alpha: true, antialias: true });
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    const [r, g, b] = resolveThemeColorRgb(canvas);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    const camera = new THREE.OrthographicCamera(0, 0, 0, 0, -1, 1);

    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(MAX_TRACKED_POINTS * 3);
    const lineColors = new Float32Array(MAX_TRACKED_POINTS * 4);
    // Kept as direct references (rather than re-reading `lineGeometry.attributes.position`
    // each frame) so `noUncheckedIndexedAccess` doesn't treat every access as possibly
    // undefined — these are the exact objects just registered on the geometry.
    const linePositionAttribute = new THREE.BufferAttribute(linePositions, 3);
    const lineColorAttribute = new THREE.BufferAttribute(lineColors, 4);
    lineGeometry.setAttribute('position', linePositionAttribute);
    lineGeometry.setAttribute('aColor', lineColorAttribute);
    const lineMaterial = new THREE.ShaderMaterial({
      vertexShader: LINE_VERTEX_SHADER,
      fragmentShader: LINE_FRAGMENT_SHADER,
      transparent: true,
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);

    const glowGeometry = new THREE.BufferGeometry();
    glowGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
    const glowColorUniform = { value: new THREE.Vector3(r, g, b) };
    const glowAlphaUniform = { value: 0 };
    const glowMaterial = new THREE.ShaderMaterial({
      vertexShader: GLOW_VERTEX_SHADER,
      fragmentShader: GLOW_FRAGMENT_SHADER,
      transparent: true,
      uniforms: {
        uColor: glowColorUniform,
        uAlpha: glowAlphaUniform,
      },
    });
    const glowPoint = new THREE.Points(glowGeometry, glowMaterial);
    scene.add(glowPoint);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      camera.left = 0;
      camera.right = width;
      camera.top = 0;
      camera.bottom = height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
    };
    resize();

    const cleanup = () => {
      lineGeometry.dispose();
      lineMaterial.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
      renderer.dispose();
    };

    if (prefersReducedMotion) {
      const staticPoints: readonly (readonly [number, number])[] = [
        [0, height / 2],
        [width / 2, height / 2 - 12],
        [width, height / 2 + 8],
      ];
      staticPoints.forEach(([x, y], index) => {
        linePositions[index * 3] = x;
        linePositions[index * 3 + 1] = y;
        linePositions[index * 3 + 2] = 0;
        lineColors[index * 4] = r;
        lineColors[index * 4 + 1] = g;
        lineColors[index * 4 + 2] = b;
        lineColors[index * 4 + 3] = 0.5;
      });
      lineGeometry.setDrawRange(0, staticPoints.length);
      linePositionAttribute.needsUpdate = true;
      lineColorAttribute.needsUpdate = true;
      renderer.render(scene, camera);
      return cleanup;
    }

    let points: TracePoint[] = [];
    let lastTime = 0;
    let phase: 'normal' | 'oscillation' | 'pause' = 'normal';
    let phaseTimer = 1;
    let animationFrame = 0;
    let cancelled = false;

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    function syncScene() {
      const count = Math.min(points.length, MAX_TRACKED_POINTS);
      for (let i = 0; i < count; i += 1) {
        const point = points[i];
        if (!point) {
          continue;
        }
        const ageFade = Math.max(0.15, point.x / width);
        linePositions[i * 3] = point.x;
        linePositions[i * 3 + 1] = point.y;
        linePositions[i * 3 + 2] = 0;
        lineColors[i * 4] = r;
        lineColors[i * 4 + 1] = g;
        lineColors[i * 4 + 2] = b;
        lineColors[i * 4 + 3] = point.opacity * ageFade;
      }
      lineGeometry.setDrawRange(0, count);
      linePositionAttribute.needsUpdate = true;
      lineColorAttribute.needsUpdate = true;

      const lastPoint = points[points.length - 1];
      if (lastPoint?.glow) {
        const ageFade = Math.max(0.15, lastPoint.x / width);
        glowPoint.position.set(lastPoint.x, lastPoint.y, 0);
        glowAlphaUniform.value = (0.4 + 0.2 * Math.sin(Date.now() * 0.01)) * ageFade;
        glowPoint.visible = true;
      } else {
        glowPoint.visible = false;
      }

      renderer.render(scene, camera);
    }

    function step(time: number) {
      if (cancelled) {
        return;
      }
      const deltaSeconds = lastTime ? (time - lastTime) / 1000 : 0;
      lastTime = time;
      if (!deltaSeconds) {
        animationFrame = requestAnimationFrame(step);
        return;
      }

      points = points
        .map((point) => ({ ...point, x: point.x - SCROLL_SPEED_PX_PER_SECOND * deltaSeconds }))
        .filter((point) => point.x > -50);

      phaseTimer -= deltaSeconds;
      if (phaseTimer <= 0) {
        const roll = Math.random();
        if (roll < 0.7) {
          phase = 'normal';
          phaseTimer = 1 + Math.random() * 2;
        } else if (roll < 0.9) {
          phase = 'oscillation';
          phaseTimer = 0.5 + Math.random();
        } else {
          phase = 'pause';
          phaseTimer = 0.6 + Math.random() * 0.3;
        }
      }

      const x = width * 0.8;
      const lastPoint = points[points.length - 1];
      let y = height / 2;
      if (phase === 'normal') {
        y += Math.sin(time * 0.005) * 5 + (Math.random() - 0.5) * 3;
      } else if (phase === 'oscillation') {
        y += Math.sin(time * 0.05) * 30 * Math.random();
      } else if (lastPoint) {
        y = lastPoint.y;
      }
      points.push({ x, y, opacity: 0.65, glow: phase === 'pause' });
      if (points.length > MAX_TRACKED_POINTS) {
        points = points.slice(points.length - MAX_TRACKED_POINTS);
      }

      syncScene();
      animationFrame = requestAnimationFrame(step);
    }

    animationFrame = requestAnimationFrame(step);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      cleanup();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="text-foreground h-24 w-full" />;
}
