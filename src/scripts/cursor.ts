// Sword cursor shared by both pages. Rules: the tip is the click point and never leaves the pointer (no lag, no
// rotation); feedback happens around the tip; touch screens and text fields keep the normal cursor.

interface CursorOptions {
  src: string;
  /** where the tip is inside the image, 0-1 */
  tip: [number, number];
  size: number;
  /** glow colour as "r,g,b" */
  glow: string;
}

const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

let el: HTMLDivElement | null = null;
let img: HTMLImageElement;
let cfg: CursorOptions;
let x = -200;
let y = -200;
let charge = 0;
let hot = 0;
let hotTo = 0;
let press = 0;
let raf = 0;
let shown = false;

const PRESSABLE = 'a,button,[role="button"],label,summary';
const TEXT = 'input,textarea,select,[contenteditable]';

function frame(): void {
  raf = 0;
  if (!el) return;
  const hx = cfg.tip[0] * cfg.size;
  const hy = cfg.tip[1] * cfg.size;
  hot += (hotTo - hot) * (reduce ? 1 : 0.3);
  el.style.transform = `translate3d(${(x - hx).toFixed(1)}px,${(y - hy).toFixed(1)}px,0)`;
  // scaled around the tip, so the click point stays exactly under the pointer
  img.style.transform = `scale(${(1 + hot * 0.08 - press * 0.1 + charge * 0.06).toFixed(3)})`;
  const lit = Math.max(hot * 0.35, charge);
  img.style.filter =
    lit > 0.01
      ? `drop-shadow(0 0 ${(2 + lit * 7).toFixed(1)}px rgba(${cfg.glow},${(0.35 + lit * 0.55).toFixed(2)})) brightness(${(1 + lit * 0.25).toFixed(2)})`
      : '';
  if (Math.abs(hotTo - hot) > 0.01) kick();
}

function kick(): void {
  if (!raf) raf = requestAnimationFrame(frame);
}

function hide(): void {
  shown = false;
  el?.classList.remove('on');
}

function ping(): void {
  const r = document.createElement('i');
  r.className = 'sword-ping';
  document.body.appendChild(r);
  r.animate(
    [
      { transform: `translate(${x}px,${y}px) scale(.3)`, opacity: 0.9 },
      { transform: `translate(${x}px,${y}px) scale(1.6)`, opacity: 0 },
    ],
    { duration: 380, easing: 'cubic-bezier(.2,.7,.3,1)' },
  ).onfinish = () => r.remove();
}

export function initSwordCursor(options: CursorOptions): void {
  if (!fine || el) return;
  cfg = options;
  const root = document.documentElement;
  root.style.setProperty('--sword-size', `${cfg.size}px`);
  root.style.setProperty('--sword-tip', `${cfg.tip[0] * 100}% ${cfg.tip[1] * 100}%`);
  root.style.setProperty('--sword-glow', cfg.glow);

  const box = document.createElement('div');
  box.className = 'sword-cur';
  box.setAttribute('aria-hidden', 'true');
  img = new Image();
  img.alt = '';
  img.decoding = 'async';
  img.src = cfg.src;
  box.appendChild(img);
  img.onload = () => {
    document.body.appendChild(box);
    root.classList.add('sword');
    el = box;
  };

  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse' || !el) return;
      x = e.clientX;
      y = e.clientY;
      if (!shown) {
        shown = true;
        el.classList.add('on');
      }
      const t = e.target instanceof Element ? e.target : null;
      el.style.visibility = t?.closest(TEXT) ? 'hidden' : '';
      hotTo = t?.closest(PRESSABLE) ? 1 : 0;
      kick();
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', hide);
  addEventListener('blur', hide);
  addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    press = 1;
    kick();
    if (!reduce) ping();
  });
  addEventListener('pointerup', () => {
    press = 0;
    kick();
  });
}

/** 0-1: how much the blade glows while something is being held */
export function setSwordCharge(value: number): void {
  charge = Math.max(0, Math.min(1, value));
  kick();
}
