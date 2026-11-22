// The aura renderer: one scene pass (background, seal, flames, smoke, lightning, the portrait, the eyes), a two-level
// bloom, and a composite pass with the optional ink look. It only draws; awaken/main.ts owns the interaction state.

import { AURA_CANVAS, eyesInAuraUv, placeInAuraCanvas } from '../../lib/portrait';
import { emptyTexture, loadImage, program, target, upload, type Target } from './gl';
import blurSrc from './shaders/blur.glsl?raw';
import brightSrc from './shaders/bright.glsl?raw';
import compositeSrc from './shaders/composite.glsl?raw';
import sceneSrc from './shaders/scene.glsl?raw';

/** the violet "shadow" palette, linear RGB */
const PALETTE = {
  deep: [0.07, 0.02, 0.14],
  aura: [0.55, 0.2, 1.0],
  hot: [0.92, 0.84, 1.0],
  alt: [0.22, 0.18, 0.95],
} as const;

/** never above 1.5x, and never more than about 3.7 million pixels */
const MAX_SCALE = Math.min(devicePixelRatio || 1, 1.5);
const PIXEL_BUDGET = 3.7e6;

export interface FrameState {
  t: number;
  power: number;
  burst: number;
  shock: number;
  shockPos: [number, number];
  mouse: [number, number];
  glow: number;
  impact: boolean;
  ink: boolean;
}

export interface AuraImages {
  portrait: string;
  background: string;
  depth: string;
}

export type AuraEngine = ReturnType<typeof createAuraEngine>;

export function createAuraEngine(
  gl: WebGL2RenderingContext,
  cv: HTMLCanvasElement,
  box: HTMLElement,
  stage: HTMLElement,
) {
  const float = !!gl.getExtension('EXT_color_buffer_float');
  const scene = program(gl, sceneSrc);
  const bright = program(gl, brightSrc);
  const blur = program(gl, blurSrc);
  const composite = program(gl, compositeSrc);
  gl.bindVertexArray(gl.createVertexArray());

  const texPortrait = emptyTexture(gl);
  const texBg = emptyTexture(gl);
  const texDepth = emptyTexture(gl);
  const eyes = eyesInAuraUv();
  let hasBg = 0;
  let hasDepth = 0;
  let bgSize: [number, number] = [1, 1];

  let RT: Record<'scene' | 'a' | 'b' | 'c' | 'd', Target> | null = null;
  let scale = 1;
  let autoScale = MAX_SCALE;
  let W = 0;
  let H = 0;
  let rect: number[] | null = null;

  function resize(force = false): void {
    const cssW = box.clientWidth;
    const cssH = box.clientHeight;
    const s = Math.min(autoScale, Math.sqrt(PIXEL_BUDGET / Math.max(1, cssW * cssH)));
    const w = Math.max(2, Math.round(cssW * s));
    const h = Math.max(2, Math.round(cssH * s));
    if (!force && w === W && h === H) return;
    scale = s;
    W = cv.width = w;
    H = cv.height = h;
    rect = null;
    if (RT) Object.values(RT).forEach((t) => t.free());
    const q4: [number, number] = [Math.max(1, w >> 2), Math.max(1, h >> 2)];
    const q16: [number, number] = [Math.max(1, w >> 4), Math.max(1, h >> 4)];
    RT = {
      scene: target(gl, w, h, float),
      a: target(gl, ...q4, float),
      b: target(gl, ...q4, float),
      c: target(gl, ...q16, float),
      d: target(gl, ...q16, float),
    };
  }

  /** where the portrait stage sits, in buffer pixels (measured once per resize, not every frame) */
  function stageRect(): number[] {
    if (!rect) {
      const r = stage.getBoundingClientRect();
      const c = cv.getBoundingClientRect();
      rect = [(r.left - c.left) * scale, (c.bottom - r.bottom) * scale, r.width * scale, r.height * scale];
    }
    return rect;
  }

  function pass(p: ReturnType<typeof program>, rt: Target | null, setup: () => void): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, rt ? rt.fb : null);
    gl.viewport(0, 0, rt ? rt.w : W, rt ? rt.h : H);
    gl.useProgram(p.handle);
    setup();
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function bind(p: ReturnType<typeof program>, name: string, tex: WebGLTexture, unit: number): void {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(p.u(name), unit);
  }

  function blurPass(src: Target, dst: Target, dx: number, dy: number): void {
    pass(blur, dst, () => {
      gl.uniform2f(blur.u('TEXEL'), 1 / dst.w, 1 / dst.h);
      gl.uniform2f(blur.u('DIR'), dx, dy);
      bind(blur, 'SRC', src.tex, 0);
    });
  }

  function render(s: FrameState): void {
    if (!RT) return;
    const rt = RT;
    pass(scene, rt.scene, () => {
      gl.uniform2f(scene.u('R'), W, H);
      gl.uniform1f(scene.u('T'), s.t);
      gl.uniform1f(scene.u('P'), s.power);
      gl.uniform1f(scene.u('BURST'), s.burst);
      gl.uniform1f(scene.u('SHOCK'), s.shock);
      gl.uniform2f(scene.u('SHOCKPOS'), ...s.shockPos);
      gl.uniform2f(scene.u('M'), ...s.mouse);
      gl.uniform4f(scene.u('RECT'), ...(stageRect() as [number, number, number, number]));
      gl.uniform1f(scene.u('HASBG'), hasBg);
      gl.uniform1f(scene.u('HASDEP'), hasDepth);
      gl.uniform2f(scene.u('BGSIZE'), ...bgSize);
      gl.uniform4f(scene.u('EYES'), ...eyes);
      gl.uniform1f(scene.u('GLOW'), Math.min(s.glow, 1.2));
      gl.uniform3f(scene.u('C_DEEP'), ...PALETTE.deep);
      gl.uniform3f(scene.u('C_AURA'), ...PALETTE.aura);
      gl.uniform3f(scene.u('C_HOT'), ...PALETTE.hot);
      gl.uniform3f(scene.u('C_ALT'), ...PALETTE.alt);
      gl.uniform1f(scene.u('INK'), s.ink ? 1 : 0);
      bind(scene, 'PT', texPortrait, 0);
      bind(scene, 'BG', texBg, 1);
      bind(scene, 'DEP', texDepth, 2);
    });
    // bloom at 1/4 and 1/16 resolution
    pass(bright, rt.a, () => {
      gl.uniform2f(bright.u('TEXEL'), 1 / rt.a.w, 1 / rt.a.h);
      gl.uniform1f(bright.u('TH'), 0.9);
      bind(bright, 'SRC', rt.scene.tex, 0);
    });
    blurPass(rt.a, rt.b, 1, 0);
    blurPass(rt.b, rt.a, 0, 1);
    blurPass(rt.a, rt.c, 1, 0);
    blurPass(rt.c, rt.d, 0, 1);
    pass(composite, null, () => {
      gl.uniform2f(composite.u('R'), W, H);
      gl.uniform1f(composite.u('T'), s.t);
      gl.uniform1f(composite.u('BURST'), s.burst);
      gl.uniform1f(composite.u('IMPACT'), s.impact ? 1 : 0);
      gl.uniform1f(composite.u('INK'), s.ink ? 1 : 0);
      gl.uniform3f(composite.u('C_AURA'), ...PALETTE.aura);
      bind(composite, 'SC', rt.scene.tex, 0);
      bind(composite, 'BL', rt.a.tex, 1);
      bind(composite, 'BL2', rt.d.tex, 2);
    });
  }

  // adaptive resolution: drop when frames run long, climb back only to the best rate this device has shown
  let frames = 0;
  let acc = 0;
  let best = 1;
  function measure(frameSeconds: number): void {
    frames++;
    acc += frameSeconds;
    if (frames < 40) return;
    const avg = acc / frames;
    frames = 0;
    acc = 0;
    best = Math.min(best, avg);
    if (avg > 0.024 && autoScale > 0.45) {
      autoScale = Math.max(0.45, autoScale * 0.82);
      resize(true);
    } else if (avg < Math.min(0.02, best * 1.2) && autoScale < MAX_SCALE) {
      autoScale = Math.min(MAX_SCALE, autoScale * 1.1);
      resize(true);
    }
  }

  async function loadImages(urls: AuraImages): Promise<void> {
    const [portrait, background, depth] = await Promise.all([
      loadImage(urls.portrait),
      loadImage(urls.background),
      loadImage(urls.depth),
    ]);
    const c = document.createElement('canvas');
    c.width = AURA_CANVAS.width;
    c.height = AURA_CANVAS.height;
    const at = placeInAuraCanvas(portrait.width, portrait.height);
    c.getContext('2d')!.drawImage(portrait, at.x, at.y, at.width, at.height);
    upload(gl, texPortrait, c);
    upload(gl, texBg, background);
    hasBg = 1;
    bgSize = [background.width, background.height];
    upload(gl, texDepth, depth);
    hasDepth = 1;
  }

  addEventListener('resize', () => resize());
  resize(true);

  return {
    render,
    measure,
    loadImages,
    /** centre of the figure in buffer pixels (where bursts start) */
    figureCenter(): [number, number] {
      const r = stageRect();
      return [r[0] + r[2] * 0.5, r[1] + r[3] * 0.47];
    },
    /** a pointer position in buffer pixels, origin bottom-left like gl_FragCoord */
    toBuffer(clientX: number, clientY: number): [number, number] {
      const r = cv.getBoundingClientRect();
      return [(clientX - r.left) * scale, (r.bottom - clientY) * scale];
    },
    get scale(): number {
      return scale;
    },
  };
}
