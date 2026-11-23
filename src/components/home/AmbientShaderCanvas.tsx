"use client";

import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";

const VERT = /* glsl */ `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec2 uMouse;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  float t = uTime * 0.25;
  vec2 m = (uMouse - 0.5) * 0.18;
  float wave1 = sin((uv.x + m.x) * 3.2 + t) * cos((uv.y - m.y) * 2.6 - t * 0.8);
  float wave2 = sin((uv.x * 2.1 - uv.y * 2.4) + t * 1.15);
  float mix1 = smoothstep(-0.85, 0.85, wave1 * 0.65 + wave2 * 0.35);
  float mix2 = smoothstep(0.1, 0.95, length(uv - vec2(0.75 + m.x, 0.3 + m.y)));
  vec3 col = mix(uColorA, uColorB, mix1);
  col = mix(col, uColorC, (1.0 - mix2) * 0.45);
  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToRgb01(hex: string, fallback: [number, number, number]): [number, number, number] {
  const clean = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return fallback;
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  ];
}

/** Nền shader WebGL siêu nhẹ (OGL ~8KB) — lazy-loaded, tôn trọng prefers-reduced-motion. */
export function AmbientShaderCanvas({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const style = getComputedStyle(document.documentElement);
    const primary = hexToRgb01(style.getPropertyValue("--brand-primary"), [0.06, 0.24, 0.18]);
    const accent = hexToRgb01(style.getPropertyValue("--brand-accent"), [0.77, 0.36, 0.15]);
    const deep: [number, number, number] = [primary[0] * 0.55, primary[1] * 0.55, primary[2] * 0.55];

    let renderer: Renderer;
    try {
      renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio || 1, 1.5), alpha: false });
    } catch {
      return;
    }

    const gl = renderer.gl;
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";
    gl.canvas.style.display = "block";
    host.appendChild(gl.canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: [0.5, 0.5] },
        uColorA: { value: deep },
        uColorB: { value: primary },
        uColorC: { value: accent },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      renderer.setSize(host.clientWidth || 1, host.clientHeight || 1);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const onMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      program.uniforms.uMouse.value = [
        (e.clientX - rect.left) / rect.width,
        1 - (e.clientY - rect.top) / rect.height,
      ];
    };
    host.addEventListener("pointermove", onMove, { passive: true });

    let raf = 0;
    const start = performance.now();
    const render = (now: number) => {
      program.uniforms.uTime.value = reduced ? 0.6 : (now - start) / 1000;
      renderer.render({ scene: mesh });
      if (!reduced) raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      if (gl.canvas.parentNode === host) host.removeChild(gl.canvas);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden bg-primary ${className}`}
    />
  );
}
