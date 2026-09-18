"use client";

import * as React from "react";
import { useEffect, useRef } from "react";

const MAX_DPR = 2;

const VERT_SRC = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uHover;

const float PI  = 3.14159265;
const float TAU = 6.28318531;

float sat(float x){ return clamp(x, 0.0, 1.0); }
float pw(float x, float e){ return pow(max(x, 1e-5), e); }
float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 34.56); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm3(vec2 p){ float s = 0.0, a = 0.5; for(int i = 0; i < 3; i++){ s += a * vnoise(p); p = p * 2.07 + vec2(4.1, 2.3); a *= 0.5; } return s; }

uniform vec3 uBg, uBase, uAccent, uHigh;
uniform float uStrands, uCurve, uSpread, uThin, uComb, uReach, uDir;

void main(){
  float ar = uRes.x / max(uRes.y, 1.0);
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (uv - 0.5) * vec2(ar, 1.0);
  float t = uTime;
  vec2 apex = vec2(0.34, 0.20);

  float cs = cos(uDir), sn = sin(uDir);
  mat2 rot = mat2(cs, sn, -sn, cs);
  vec2 q  = rot * p;
  vec2 pm = q - rot * ((uMouse - 0.5) * vec2(ar, 1.0));
  vec2 ps = q - normalize(pm + vec2(1e-5)) * uComb * 0.10 * sat(uHover)
            * exp(-dot(pm, pm) / max(uReach * uReach, 1e-4));
  float core = 0.0, halo = 0.0;
  for(int i = 0; i < 26; i++){
    float fi = float(i);
    float f = fi / 25.0;
    float on = sat(uStrands - fi);
    float jit = hash21(vec2(fi, 1.7));
    float k = uCurve * (0.55 + 1.30 * f + 0.10 * jit);
    float ax = apex.x + (f - 0.5) * uSpread * 0.18;
    float ay = apex.y + (f - 0.5) * uSpread * 0.14 + 0.012 * sin(t * 0.5 + fi);
    float dx = ps.x - ax;
    float yc = ay - k * dx * dx;
    float sl = -2.0 * k * dx;
    float dd = abs(ps.y - yc) / sqrt(1.0 + sl * sl);
    float w = uThin * (0.0016 + 0.0032 * jit);
    core += on * pw(w / (w + dd), 2.2);
    halo += on * pw(w * 14.0 / (w * 14.0 + dd), 1.55) * 0.14;
  }
  float env = mix(0.20, 1.0, sat((ps.x + 0.52) / 0.95));
  core *= env; halo *= env;
  vec3 col = uBg;
  col += uBase * halo * 1.5;
  col += mix(uAccent, uHigh, sat(core * 0.75)) * core * 1.4;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error("FibreArc shader:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function parseColor(
  input: string | undefined,
  fb: [number, number, number],
): [number, number, number] {
  if (!input) return fb;
  const str = String(input).trim();
  if (str.charAt(0) === "#") {
    let hex = str.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex =
        hex.charAt(0) +
        hex.charAt(0) +
        hex.charAt(1) +
        hex.charAt(1) +
        hex.charAt(2) +
        hex.charAt(2);
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r / 255, g / 255, b / 255];
    }
    return fb;
  }
  const m = str.match(/[\d.]+/g);
  if (m && m.length >= 3) {
    return [
      Math.min(255, parseFloat(m[0]!)) / 255,
      Math.min(255, parseFloat(m[1]!)) / 255,
      Math.min(255, parseFloat(m[2]!)) / 255,
    ];
  }
  return fb;
}

function num(v: unknown, fb: number): number {
  return typeof v === "number" && isFinite(v) ? v : fb;
}

function clampN(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

type BundleGroup = { curve?: number; spread?: number; thickness?: number; comb?: number };
const BUNDLE_DEFAULTS: Required<BundleGroup> = {
  curve: 150,
  spread: 100,
  thickness: 100,
  comb: 170,
};

interface Props {
  style?: React.CSSProperties;
  width?: number;
  height?: number;
  background?: string;
  baseColor?: string;
  accentColor?: string;
  highlight?: string;
  density?: number;
  speed?: number;
  direction?: number;
  hover?: number;
  reach?: number;
  bundle?: BundleGroup;
}

export default function FibreArc(props: Props) {
  const {
    style,
    background = "#01030A",
    baseColor = "#1B4FD8",
    accentColor = "#6FC8FF",
    highlight = "#FFFFFF",
    density = 26,
    speed = 100,
    direction = 0,
    hover = 200,
    reach = 23,
    bundle,
    width,
    height,
  } = props;

  const bundle_ = { ...BUNDLE_DEFAULTS, ...(bundle || {}) };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  sizeRef.current = { w: num(width, 0), h: num(height, 0) };

  const vRef = useRef<Record<string, number | string>>({});
  vRef.current = {
    background: background,
    baseColor: baseColor,
    accentColor: accentColor,
    highlight: highlight,
    density: clampN(num(density, 26), 4, 26),
    speed: clampN(num(speed, 50), 0, 100) / 50,
    direction: (clampN(num(direction, 0), 0, 360) * Math.PI) / 180,
    hover: clampN(num(hover, 100), 0, 200) / 100,
    reach: clampN(num(reach, 30), 5, 100) / 100,
    curve: clampN(num(bundle_.curve, 150), 20, 400) / 100,
    spread: clampN(num(bundle_.spread, 100), 0, 300) / 100,
    thickness: clampN(num(bundle_.thickness, 100), 20, 400) / 100,
    comb: clampN(num(bundle_.comb, 170), 0, 400) / 100,
  };

  const ptrRef = useRef({ x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, on: 0, onTarget: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true, alpha: false, depth: false });
    if (!gl) {
      console.error("FibreArc: WebGL unavailable");
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("FibreArc link:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const locs: Record<string, WebGLUniformLocation | null> = {};
    const u = (name: string) => {
      if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name);
      return locs[name] ?? null;
    };

    let raf = 0;
    let last = performance.now();
    let clock = 0;

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const v = vRef.current;

      clock = (clock + dt * (v.speed as number)) % 3600;

      const ptr = ptrRef.current;
      const k = 1 - Math.exp(-3.2 * dt);
      ptr.on += (ptr.onTarget - ptr.on) * k;
      ptr.x += ((ptr.onTarget > 0 ? ptr.tx : 0.5) - ptr.x) * k;
      ptr.y += ((ptr.onTarget > 0 ? ptr.ty : 0.5) - ptr.y) * k;

      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const cw = sizeRef.current.w || canvas.clientWidth || 1200;
      const ch = sizeRef.current.h || canvas.clientHeight || 800;
      const bw = Math.max(1, Math.round(cw * dpr));
      const bh = Math.max(1, Math.round(ch * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      gl.viewport(0, 0, bw, bh);

      gl.uniform2f(u("uRes"), bw, bh);
      gl.uniform1f(u("uTime"), clock);
      gl.uniform2f(u("uMouse"), ptr.x, 1 - ptr.y);
      gl.uniform1f(u("uHover"), Math.min(1, ptr.on) * (v.hover as number));
      const c_uBg = parseColor(v.background as string, [0.004, 0.012, 0.039]);
      gl.uniform3f(u("uBg"), c_uBg[0], c_uBg[1], c_uBg[2]);
      const c_uBase = parseColor(v.baseColor as string, [0.106, 0.31, 0.847]);
      gl.uniform3f(u("uBase"), c_uBase[0], c_uBase[1], c_uBase[2]);
      const c_uAccent = parseColor(v.accentColor as string, [0.435, 0.784, 1.0]);
      gl.uniform3f(u("uAccent"), c_uAccent[0], c_uAccent[1], c_uAccent[2]);
      const c_uHigh = parseColor(v.highlight as string, [1.0, 1.0, 1.0]);
      gl.uniform3f(u("uHigh"), c_uHigh[0], c_uHigh[1], c_uHigh[2]);
      gl.uniform1f(u("uStrands"), v.density as number);
      gl.uniform1f(u("uReach"), v.reach as number);
      gl.uniform1f(u("uDir"), v.direction as number);
      gl.uniform1f(u("uCurve"), v.curve as number);
      gl.uniform1f(u("uSpread"), v.spread as number);
      gl.uniform1f(u("uThin"), v.thickness as number);
      gl.uniform1f(u("uComb"), v.comb as number);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(render);
    };

    const track = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      ptrRef.current.tx = clampN((e.clientX - r.left) / r.width, 0, 1);
      ptrRef.current.ty = clampN((e.clientY - r.top) / r.height, 0, 1);
      ptrRef.current.onTarget = 1;
    };
    const onLeave = () => {
      ptrRef.current.onTarget = 0;
    };

    canvas.addEventListener("pointermove", track);
    canvas.addEventListener("pointerenter", track);
    canvas.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", track);
      canvas.removeEventListener("pointerenter", track);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background,
        minWidth: 1200,
        minHeight: 800,
        width: typeof width === "number" && width > 0 ? width : "100%",
        height: typeof height === "number" && height > 0 ? height : "100%",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}
