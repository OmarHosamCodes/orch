import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from "ogl";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type GL = Renderer["gl"];

type GalleryItem = { image: string; text: string };

type ScreenSize = { width: number; height: number };
type Viewport = { width: number; height: number };
type ScrollState = {
  current: number;
  last: number;
  target: number;
  ease: number;
  position?: number;
};

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

function getFontSize(font: string): number {
  const match = font.match(/(\d+)px/);
  const sizeToken = match?.[1];
  return sizeToken ? Number.parseInt(sizeToken, 10) : 28;
}

function initialsFrom(text: string): string {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters = parts.map((part) => part[0] ?? "").join("");
  return letters.slice(0, 2).toUpperCase() || "?";
}

function createFallbackCanvas(text: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 600;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.fillStyle = "#2a2a2e";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f4f4f5";
  context.font = "bold 180px Poppins, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(initialsFrom(text), canvas.width / 2, canvas.height / 2);
  return canvas;
}

function createTextTexture(
  gl: GL,
  text: string,
  font: string,
  color: string,
): { texture: Texture; width: number; height: number } {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not get 2d context");

  context.font = font;
  const metrics = context.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const fontSize = getFontSize(font);
  const textHeight = Math.ceil(fontSize * 1.2);

  canvas.width = textWidth + 20;
  canvas.height = textHeight + 20;

  context.font = font;
  context.fillStyle = color;
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

class Title {
  mesh: Mesh;

  constructor({
    gl,
    plane,
    text,
    textColor,
    font,
  }: {
    gl: GL;
    plane: Mesh;
    text: string;
    textColor: string;
    font: string;
  }) {
    const { texture, width, height } = createTextTexture(gl, text, font, textColor);
    const geometry = new Plane(gl);
    const program = new Program(gl, {
      vertex: `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tMap, vUv);
          if (color.a < 0.1) discard;
          gl_FragColor = color;
        }
      `,
      uniforms: { tMap: { value: texture } },
      transparent: true,
    });
    this.mesh = new Mesh(gl, { geometry, program });
    const aspect = width / height;
    const textHeightScaled = plane.scale.y * 0.15;
    const textWidthScaled = textHeightScaled * aspect;
    this.mesh.scale.set(textWidthScaled, textHeightScaled, 1);
    this.mesh.position.y = -plane.scale.y * 0.5 - textHeightScaled * 0.5 - 0.05;
    this.mesh.setParent(plane);
  }
}

class Media {
  extra = 0;
  geometry: Plane;
  gl: GL;
  image: string;
  index: number;
  length: number;
  scene: Transform;
  screen: ScreenSize;
  text: string;
  viewport: Viewport;
  bend: number;
  textColor: string;
  borderRadius: number;
  font: string;
  program!: Program;
  plane!: Mesh;
  scale = 1;
  padding = 2;
  width = 0;
  widthTotal = 0;
  x = 0;
  speed = 0;
  isBefore = false;
  isAfter = false;

  constructor({
    geometry,
    gl,
    image,
    index,
    length,
    scene,
    screen,
    text,
    viewport,
    bend,
    textColor,
    borderRadius,
    font,
  }: {
    geometry: Plane;
    gl: GL;
    image: string;
    index: number;
    length: number;
    scene: Transform;
    screen: ScreenSize;
    text: string;
    viewport: Viewport;
    bend: number;
    textColor: string;
    borderRadius: number;
    font: string;
  }) {
    this.geometry = geometry;
    this.gl = gl;
    this.image = image;
    this.index = index;
    this.length = length;
    this.scene = scene;
    this.screen = screen;
    this.text = text;
    this.viewport = viewport;
    this.bend = bend;
    this.textColor = textColor;
    this.borderRadius = borderRadius;
    this.font = font;
    this.createShader();
    this.createMesh();
    this.createTitle();
    this.onResize();
  }

  createShader() {
    const texture = new Texture(this.gl, { generateMipmaps: true });
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uTime;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z = (sin(p.x * 4.0 + uTime) * 1.5 + cos(p.y * 2.0 + uTime) * 1.5) * (0.03 + uSpeed * 0.25);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        varying vec2 vUv;

        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }

        void main() {
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
          );
          vec4 color = texture2D(tMap, uv);
          float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          float edgeSmooth = 0.002;
          float alpha = 1.0 - smoothstep(-edgeSmooth, edgeSmooth, d);
          gl_FragColor = vec4(color.rgb, alpha);
        }
      `,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [800, 600] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: this.borderRadius },
      },
      transparent: true,
    });

    const applyImage = (
      source: HTMLImageElement | HTMLCanvasElement,
      width: number,
      height: number,
    ) => {
      texture.image = source;
      this.program.uniforms.uImageSizes.value = [width, height];
    };

    const fallback = createFallbackCanvas(this.text);
    applyImage(fallback, fallback.width, fallback.height);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      applyImage(img, img.naturalWidth, img.naturalHeight);
    };
    img.onerror = () => {
      applyImage(fallback, fallback.width, fallback.height);
    };
    img.src = this.image;
  }

  createMesh() {
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program,
    });
    this.plane.setParent(this.scene);
  }

  createTitle() {
    new Title({
      gl: this.gl,
      plane: this.plane,
      text: this.text,
      textColor: this.textColor,
      font: this.font,
    });
  }

  update(scroll: ScrollState, direction: "right" | "left") {
    this.plane.position.x = this.x - scroll.current - this.extra;

    const x = this.plane.position.x;
    const halfViewport = this.viewport.width / 2;

    if (this.bend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      const bendAbs = Math.abs(this.bend);
      const radius = (halfViewport * halfViewport + bendAbs * bendAbs) / (2 * bendAbs);
      const effectiveX = Math.min(Math.abs(x), halfViewport);
      const arc = radius - Math.sqrt(Math.max(radius * radius - effectiveX * effectiveX, 0));
      if (this.bend > 0) {
        this.plane.position.y = -arc;
        this.plane.rotation.z = -Math.sign(x) * Math.asin(Math.min(effectiveX / radius, 1));
      } else {
        this.plane.position.y = arc;
        this.plane.rotation.z = Math.sign(x) * Math.asin(Math.min(effectiveX / radius, 1));
      }
    }

    this.speed = scroll.current - scroll.last;
    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = this.speed;

    const planeOffset = this.plane.scale.x / 2;
    const viewportOffset = this.viewport.width / 2;
    this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
    this.isAfter = this.plane.position.x - planeOffset > viewportOffset;
    if (direction === "right" && this.isBefore) {
      this.extra -= this.widthTotal;
      this.isBefore = false;
      this.isAfter = false;
    }
    if (direction === "left" && this.isAfter) {
      this.extra += this.widthTotal;
      this.isBefore = false;
      this.isAfter = false;
    }
  }

  onResize({ screen, viewport }: { screen?: ScreenSize; viewport?: Viewport } = {}) {
    if (screen) this.screen = screen;
    if (viewport) this.viewport = viewport;
    this.scale = this.screen.height / 1500;
    this.plane.scale.y = (this.viewport.height * (900 * this.scale)) / this.screen.height;
    this.plane.scale.x = (this.viewport.width * (700 * this.scale)) / this.screen.width;
    this.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    this.padding = 2;
    this.width = this.plane.scale.x + this.padding;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  }
}

type GalleryHandlers = {
  onSelectedIndexChange?: (index: number) => void;
  onItemActivate?: (index: number) => void;
};

class GalleryApp {
  container: HTMLElement;
  scrollSpeed: number;
  originalLength: number;
  scroll: ScrollState;
  onCheckDebounce: () => void;
  renderer: Renderer;
  gl: GL;
  camera: Camera;
  scene: Transform;
  planeGeometry: Plane;
  medias: Media[] = [];
  screen: ScreenSize = { width: 1, height: 1 };
  viewport: Viewport = { width: 1, height: 1 };
  raf = 0;
  isDown = false;
  start = 0;
  pointerMoved = false;
  lastEmittedIndex = 0;
  handlers: GalleryHandlers;
  resizeObserver: ResizeObserver | null = null;
  boundOnWheel: (event: WheelEvent) => void;
  boundOnPointerDown: (event: PointerEvent) => void;
  boundOnPointerMove: (event: PointerEvent) => void;
  boundOnPointerUp: (event: PointerEvent) => void;
  boundOnKeyDown: (event: KeyboardEvent) => void;
  boundOnDoubleClick: () => void;

  constructor(
    container: HTMLElement,
    {
      items,
      bend = 3,
      textColor = "#ffffff",
      borderRadius = 0.05,
      font = "bold 28px Poppins",
      scrollSpeed = 5,
      scrollEase = 0.05,
      selectedIndex = 0,
      handlers = {},
    }: {
      items: GalleryItem[];
      bend?: number;
      textColor?: string;
      borderRadius?: number;
      font?: string;
      scrollSpeed?: number;
      scrollEase?: number;
      selectedIndex?: number;
      handlers?: GalleryHandlers;
    },
  ) {
    this.container = container;
    this.scrollSpeed = scrollSpeed;
    this.originalLength = items.length;
    this.handlers = handlers;
    this.scroll = { ease: scrollEase, current: 0, target: 0, last: 0 };
    this.onCheckDebounce = debounce(() => {
      this.onCheck();
      this.emitSelected();
    }, 200);

    this.renderer = new Renderer({
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    const canvas = this.renderer.gl.canvas as HTMLCanvasElement;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.touchAction = "none";
    this.container.appendChild(canvas);

    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
    this.scene = new Transform();
    this.planeGeometry = new Plane(this.gl, {
      heightSegments: 50,
      widthSegments: 100,
    });

    this.boundOnWheel = this.onWheel.bind(this);
    this.boundOnPointerDown = this.onPointerDown.bind(this);
    this.boundOnPointerMove = this.onPointerMove.bind(this);
    this.boundOnPointerUp = this.onPointerUp.bind(this);
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this.boundOnDoubleClick = this.onDoubleClick.bind(this);

    this.onResize();
    this.createMedias(items, bend, textColor, borderRadius, font);
    if (selectedIndex > 0) {
      this.setSelectedIndex(selectedIndex);
      this.scroll.current = this.scroll.target;
      this.scroll.last = this.scroll.current;
    }
    this.lastEmittedIndex = wrapIndex(selectedIndex, this.originalLength);
    this.update();
    this.addEventListeners();
  }

  createMedias(
    items: GalleryItem[],
    bend: number,
    textColor: string,
    borderRadius: number,
    font: string,
  ) {
    const galleryItems = items.length ? items.concat(items) : items;
    this.medias = galleryItems.map(
      (data, index) =>
        new Media({
          geometry: this.planeGeometry,
          gl: this.gl,
          image: data.image,
          index,
          length: galleryItems.length,
          scene: this.scene,
          screen: this.screen,
          text: data.text,
          viewport: this.viewport,
          bend,
          textColor,
          borderRadius,
          font,
        }),
    );
  }

  readCenteredOriginalIndex(): number {
    if (this.originalLength === 0 || this.medias.length === 0) return 0;
    let closestIndex = 0;
    let closestDist = Number.POSITIVE_INFINITY;
    for (const media of this.medias) {
      const distance = Math.abs(media.plane.position.x);
      if (distance < closestDist) {
        closestDist = distance;
        closestIndex = media.index;
      }
    }
    return wrapIndex(closestIndex, this.originalLength);
  }

  emitSelected() {
    const index = this.readCenteredOriginalIndex();
    if (index === this.lastEmittedIndex) return;
    this.lastEmittedIndex = index;
    this.handlers.onSelectedIndexChange?.(index);
  }

  setSelectedIndex(index: number) {
    if (this.isDown) return;
    if (this.originalLength === 0 || this.medias.length === 0) return;
    const next = wrapIndex(index, this.originalLength);
    let best: Media | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const media of this.medias) {
      if (wrapIndex(media.index, this.originalLength) !== next) continue;
      const distance = Math.abs(media.plane.position.x);
      if (distance < bestDist) {
        bestDist = distance;
        best = media;
      }
    }
    if (!best) return;
    if (bestDist < 0.04) {
      this.lastEmittedIndex = next;
      return;
    }
    this.scroll.target = this.scroll.current + best.plane.position.x;
    this.lastEmittedIndex = next;
  }

  selectAtClientX(clientX: number) {
    const media = this.medias[0];
    if (!media || this.originalLength === 0) return;
    const rect = this.container.getBoundingClientRect();
    if (rect.width === 0) return;
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const clickX = (nx * this.viewport.width) / 2;
    let closestIndex = 0;
    let closestDist = Number.POSITIVE_INFINITY;
    for (const item of this.medias) {
      const distance = Math.abs(item.plane.position.x - clickX);
      if (distance < closestDist) {
        closestDist = distance;
        closestIndex = item.index;
      }
    }
    this.setSelectedIndex(wrapIndex(closestIndex, this.originalLength));
    this.emitSelected();
  }

  onPointerDown(event: PointerEvent) {
    this.isDown = true;
    this.pointerMoved = false;
    this.scroll.position = this.scroll.current;
    this.start = event.clientX;
    this.container.setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent) {
    if (!this.isDown) return;
    const distance = (this.start - event.clientX) * (this.scrollSpeed * 0.07);
    if (Math.abs(event.clientX - this.start) > 8) this.pointerMoved = true;
    this.scroll.target = (this.scroll.position ?? 0) + distance;
  }

  onPointerUp(event: PointerEvent) {
    if (!this.isDown) return;
    this.isDown = false;
    if (this.container.hasPointerCapture(event.pointerId)) {
      this.container.releasePointerCapture(event.pointerId);
    }
    if (!this.pointerMoved) this.selectAtClientX(event.clientX);
    else {
      this.onCheck();
      this.emitSelected();
    }
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    event.stopPropagation();
    const delta = event.deltaY || event.deltaX;
    this.scroll.target += (delta > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.65;
    this.onCheckDebounce();
  }

  onKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        this.scroll.target += this.scrollSpeed * 11;
        this.onCheckDebounce();
        break;
      case "ArrowLeft":
        event.preventDefault();
        this.scroll.target -= this.scrollSpeed * 11;
        this.onCheckDebounce();
        break;
      case "Enter":
        event.preventDefault();
        this.handlers.onItemActivate?.(this.readCenteredOriginalIndex());
        break;
      default:
        break;
    }
  }

  onDoubleClick() {
    this.handlers.onItemActivate?.(this.readCenteredOriginalIndex());
  }

  onCheck() {
    const media = this.medias[0];
    if (!media || media.width === 0) return;
    const width = media.width;
    const itemIndex = Math.round(Math.abs(this.scroll.target) / width);
    const item = width * itemIndex;
    this.scroll.target = this.scroll.target < 0 ? -item : item;
  }

  onResize() {
    this.screen = {
      width: Math.max(this.container.clientWidth, 1),
      height: Math.max(this.container.clientHeight, 1),
    };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({
      aspect: this.screen.width / this.screen.height,
    });
    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    const width = height * this.camera.aspect;
    this.viewport = { width, height };
    for (const media of this.medias) {
      media.onResize({ screen: this.screen, viewport: this.viewport });
    }
  }

  update() {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const direction: "right" | "left" = this.scroll.current > this.scroll.last ? "right" : "left";
    for (const media of this.medias) {
      media.update(this.scroll, direction);
    }
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    if (this.isDown) this.emitSelected();
    this.raf = window.requestAnimationFrame(() => this.update());
  }

  addEventListeners() {
    this.container.addEventListener("wheel", this.boundOnWheel, { passive: false });
    this.container.addEventListener("pointerdown", this.boundOnPointerDown);
    this.container.addEventListener("pointermove", this.boundOnPointerMove);
    this.container.addEventListener("pointerup", this.boundOnPointerUp);
    this.container.addEventListener("pointercancel", this.boundOnPointerUp);
    this.container.addEventListener("keydown", this.boundOnKeyDown);
    this.container.addEventListener("dblclick", this.boundOnDoubleClick);
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.container);
  }

  destroy() {
    window.cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    this.container.removeEventListener("wheel", this.boundOnWheel);
    this.container.removeEventListener("pointerdown", this.boundOnPointerDown);
    this.container.removeEventListener("pointermove", this.boundOnPointerMove);
    this.container.removeEventListener("pointerup", this.boundOnPointerUp);
    this.container.removeEventListener("pointercancel", this.boundOnPointerUp);
    this.container.removeEventListener("keydown", this.boundOnKeyDown);
    this.container.removeEventListener("dblclick", this.boundOnDoubleClick);
    const canvas = this.renderer.gl.canvas as HTMLCanvasElement;
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }
}

function debounce(func: () => void, wait: number): () => void {
  let timeout = 0;
  return () => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(func, wait);
  };
}

export type CircularGalleryProps = {
  items?: GalleryItem[];
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  font?: string;
  scrollSpeed?: number;
  scrollEase?: number;
  selectedIndex?: number;
  onSelectedIndexChange?: (index: number) => void;
  onItemActivate?: (index: number) => void;
  className?: string;
};

export default function CircularGallery({
  items = [],
  bend = 3,
  textColor = "#ffffff",
  borderRadius = 0.05,
  font = "bold 28px Poppins",
  scrollSpeed = 5,
  scrollEase = 0.05,
  selectedIndex = 0,
  onSelectedIndexChange,
  onItemActivate,
  className,
}: CircularGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<GalleryApp | null>(null);
  const handlersRef = useRef<GalleryHandlers>({});
  const initialIndexRef = useRef(selectedIndex);
  handlersRef.current.onSelectedIndexChange = onSelectedIndexChange;
  handlersRef.current.onItemActivate = onItemActivate;

  useEffect(() => {
    if (!containerRef.current || items.length === 0) return;
    let isMounted = true;
    const start = () => {
      if (!isMounted || !containerRef.current) return;
      const app = new GalleryApp(containerRef.current, {
        items,
        bend,
        textColor,
        borderRadius,
        font,
        scrollSpeed,
        scrollEase,
        selectedIndex: initialIndexRef.current,
        handlers: handlersRef.current,
      });
      appRef.current = app;
    };

    if (document.fonts?.load) {
      void document.fonts.load(font).finally(start);
    } else {
      start();
    }

    return () => {
      isMounted = false;
      appRef.current?.destroy();
      appRef.current = null;
    };
  }, [items, bend, textColor, borderRadius, font, scrollSpeed, scrollEase]);

  useEffect(() => {
    appRef.current?.setSelectedIndex(selectedIndex);
  }, [selectedIndex]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full w-full cursor-grab overflow-hidden touch-none active:cursor-grabbing",
        className,
      )}
      tabIndex={0}
      role="region"
      aria-label="Member portrait gallery. Use Left and Right Arrow keys to browse, Enter to open setup."
    />
  );
}
