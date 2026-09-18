"use client";

import * as React from "react";

const VERT = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
#define MAXLINES 12

uniform vec2 uResolution;
uniform float uTime;
uniform float uLineWidth;
uniform float uSpread;
uniform float uBands;
uniform float uScale;
uniform float uIntensity;
uniform int uLineCount;
uniform vec3 uTint;
uniform vec2 uPointer;
uniform float uHover;
uniform float uReach;

float channel(vec2 uv, float r, float t, float jf) {
  float sum = 0.0;
  float band = mod(uv.x + uv.y, uBands);
  for (int i = 0; i < MAXLINES; i++) {
    if (i < uLineCount) {
      float d = fract(t - uSpread * jf + float(i) * 0.01) * 5.0 - r + band;
      sum += uLineWidth * float(i * i) / max(abs(d), 1e-4);
    }
  }
  return sum;
}

void main() {
  vec2 s = (gl_FragCoord.xy * 2.0 - uResolution) / min(uResolution.x, uResolution.y);
  s *= uScale;
  vec2 uv = s - uPointer * min(uHover, 1.0);
  float reach = max(uReach, 1e-3);
  float r = length(uv);
  float t = uTime * 0.05;
  vec3 color = vec3(
    channel(uv, r, t, 0.0),
    channel(uv, r, t, 1.0),
    channel(uv, r, t, 2.0)
  );
  float dp = length(s - uPointer) / reach;
  float glow = uHover * exp(-dp * dp);
  vec3 c = min(color * uIntensity * (1.0 + glow) * uTint, vec3(1.0));
  gl_FragColor = vec4(c, clamp(max(max(c.r, c.g), c.b), 0.0, 1.0));
}
`;

const MAX_DPR = 2;
const BASE_RATE = 3;
const LINE_COUNT = 5;
const FOLLOW_RATE = 8;
const HOVER_REACH_PX = 260;

interface ReflectShaderProps {
  background?: string;
  tint?: string;
  speed?: number;
  brightness?: number;
  thickness?: number;
  chromatic?: number;
  bandGap?: number;
  zoom?: number;
  hover?: number;
  style?: React.CSSProperties;
}

function parseColor(input: string | undefined): [number, number, number] {
  if (!input) return [1, 1, 1];
  const value = input.trim();
  if (value[0] === "#") {
    let hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .slice(0, 3)
        .split("")
        .map((channel) => channel + channel)
        .join("");
    }
    const number = parseInt(hex.slice(0, 6), 16);
    if (Number.isNaN(number)) return [1, 1, 1];
    return [((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255];
  }
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (!match) return [1, 1, 1];
  const parts = match[1]!.split(",").map((part) => parseFloat(part));
  return [(parts[0] || 0) / 255, (parts[1] || 0) / 255, (parts[2] || 0) / 255];
}

export default function ReflectShader({
  background = "#020202",
  tint = "#ffffff",
  speed = 50,
  brightness = 100,
  thickness = 20,
  chromatic = 10,
  bandGap = 20,
  zoom = 295,
  hover = 90,
  style,
}: ReflectShaderProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const live = React.useRef({
    speed,
    brightness,
    thickness,
    chromatic,
    bandGap,
    zoom,
    tint,
    hover,
  });
  live.current = { speed, brightness, thickness, chromatic, bandGap, zoom, tint, hover };
  const pointer = React.useRef({ tx: 0, ty: 0, x: 0, y: 0, inside: 0, ease: 0 });

  const toUv = (event: React.PointerEvent<HTMLDivElement>) => {
    const width = event.currentTarget.clientWidth || 1;
    const height = event.currentTarget.clientHeight || 1;
    const minimum = Math.min(width, height);
    const nativeEvent = event.nativeEvent;
    return {
      x: (nativeEvent.offsetX * 2 - width) / minimum,
      y: (height - nativeEvent.offsetY * 2) / minimum,
    };
  };

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: true,
      premultipliedAlpha: true,
    });
    if (!gl) return;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const vertexShader = compile(gl.VERTEX_SHADER, VERT);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vertexShader || !fragmentShader) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniform = {
      resolution: gl.getUniformLocation(program, "uResolution"),
      time: gl.getUniformLocation(program, "uTime"),
      lineWidth: gl.getUniformLocation(program, "uLineWidth"),
      spread: gl.getUniformLocation(program, "uSpread"),
      bands: gl.getUniformLocation(program, "uBands"),
      scale: gl.getUniformLocation(program, "uScale"),
      intensity: gl.getUniformLocation(program, "uIntensity"),
      lineCount: gl.getUniformLocation(program, "uLineCount"),
      tint: gl.getUniformLocation(program, "uTint"),
      pointer: gl.getUniformLocation(program, "uPointer"),
      hover: gl.getUniformLocation(program, "uHover"),
      reach: gl.getUniformLocation(program, "uReach"),
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const width = Math.max(1, Math.round((canvas.clientWidth || 1) * dpr));
      const height = Math.max(1, Math.round((canvas.clientHeight || 1) * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uniform.resolution, width, height);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    let animationFrame = 0;
    let lastTime = 0;
    let time = 0;
    const frame = (now: number) => {
      animationFrame = requestAnimationFrame(frame);
      const delta = lastTime ? Math.min((now - lastTime) / 1000, 1 / 15) : 0;
      lastTime = now;
      const values = live.current;
      time = (time + BASE_RATE * (values.speed / 50) * delta) % 20000;
      gl.uniform1f(uniform.time, time);
      gl.uniform1f(uniform.lineWidth, values.thickness / 10000);
      gl.uniform1f(uniform.spread, values.chromatic / 1000);
      gl.uniform1f(uniform.bands, Math.max(values.bandGap, 1) / 100);
      gl.uniform1f(uniform.scale, values.zoom / 100);
      gl.uniform1f(uniform.intensity, values.brightness / 100);
      gl.uniform1i(uniform.lineCount, LINE_COUNT);
      const [red, green, blue] = parseColor(values.tint);
      gl.uniform3f(uniform.tint, red, green, blue);
      const state = pointer.current;
      const easing = 1 - Math.exp(-delta * FOLLOW_RATE);
      state.x += (state.tx - state.x) * easing;
      state.y += (state.ty - state.y) * easing;
      state.ease += (state.inside - state.ease) * easing;
      const scale = values.zoom / 100;
      const side = Math.max(1, Math.min(canvas.clientWidth || 1, canvas.clientHeight || 1));
      const reach = ((HOVER_REACH_PX * 2) / side) * scale;
      gl.uniform2f(uniform.pointer, state.x * scale, state.y * scale);
      gl.uniform1f(uniform.hover, (values.hover / 100) * state.ease);
      gl.uniform1f(uniform.reach, reach);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    animationFrame = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      onPointerMove={(event) => {
        const next = toUv(event);
        pointer.current.tx = next.x;
        pointer.current.ty = next.y;
        pointer.current.inside = 1;
      }}
      onPointerLeave={() => {
        pointer.current.tx = 0;
        pointer.current.ty = 0;
        pointer.current.inside = 0;
      }}
      style={{
        width: "100%",
        height: "100%",
        minWidth: 1200,
        minHeight: 800,
        position: "relative",
        overflow: "hidden",
        background,
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

ReflectShader.displayName = "Reflect Shader";
