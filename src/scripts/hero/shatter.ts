// Hold the panel (pointer, or Space/Enter) and cracks grow from that point; at full charge the panel breaks into
// 3D shards and the page cuts to Awaken. A short press is a normal press (the status card).

import { setSwordCharge } from '../cursor';
import { crackPath, triangles, type Point } from '../../lib/shatterGeometry';
import { sfx } from '../sfx';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const AWAKEN_URL = '/awaken';

interface ShatterOptions {
  panel: HTMLElement;
  /** the panel as currently shown, captured for the shards */
  snapshot: () => HTMLCanvasElement | null;
  cracks: SVGSVGElement;
  dark: HTMLElement;
  /** fetched the moment a hold starts, so Awaken is ready when the shatter ends */
  prefetch: string[];
  onShortPress: () => void;
}

export function initShatter(o: ShatterOptions): { isHolding: () => boolean; consumeHeld: () => boolean } {
  const { panel, cracks, dark } = o;
  let holding = false;
  let held = false;
  let gone = false;
  let holdT0 = 0;
  let holdRaf = 0;
  let lastCrack = 0;
  let origin: Point = [0.5, 0.5];
  let prefetched = false;

  function buildCracks([px, py]: Point): void {
    const r = panel.getBoundingClientRect();
    cracks.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    const d = crackPath(r.width, r.height, px * r.width, py * r.height);
    cracks.innerHTML = `<path class="k" pathLength="1" d="${d}"/><path class="w" pathLength="1" d="${d}"/>`;
    setCrack(0);
  }

  function setCrack(f: number): void {
    cracks.querySelectorAll('path').forEach((p) => {
      p.style.strokeDasharray = '1 1';
      p.style.strokeDashoffset = String(1 - f);
    });
  }

  function prefetchAwaken(): void {
    if (prefetched) return;
    prefetched = true;
    for (const href of [AWAKEN_URL, ...o.prefetch]) {
      const l = document.createElement('link');
      l.rel = 'prefetch';
      l.href = href;
      document.head.appendChild(l);
    }
  }

  function holdLoop(now: number): void {
    const f = Math.min(1, Math.max(0, (now - holdT0 - 200) / 1100));
    if (f > 0) held = true;
    setCrack(f);
    setSwordCharge(f);
    if (f > 0 && now - lastCrack > 230 - f * 170) {
      lastCrack = now;
      sfx.crack(f);
    }
    if (!reduce && f > 0) {
      const j = f * 4;
      panel.classList.add('tilting');
      panel.style.transform = `translate(${((Math.random() - 0.5) * j).toFixed(1)}px, ${((Math.random() - 0.5) * j).toFixed(1)}px) scale(${1 - f * 0.02})`;
    }
    if (f >= 1) {
      holding = false;
      shatter();
      return;
    }
    holdRaf = requestAnimationFrame(holdLoop);
  }

  function startHold(at: Point): void {
    if (gone || holding) return;
    origin = at;
    buildCracks(at);
    holding = true;
    held = false;
    holdT0 = performance.now();
    sfx.preload('/sfx/shatter.mp3');
    prefetchAwaken();
    holdRaf = requestAnimationFrame(holdLoop);
  }

  function cancelHold(): void {
    if (!holding) return;
    holding = false;
    cancelAnimationFrame(holdRaf);
    setCrack(0);
    setSwordCharge(0);
    panel.style.transform = '';
    panel.classList.remove('tilting');
  }

  function shatter(): void {
    gone = true;
    cancelAnimationFrame(holdRaf);
    sfx.shatter();
    const r = panel.getBoundingClientRect();
    if (reduce) {
      dark.classList.add('on');
      setTimeout(() => location.assign(AWAKEN_URL), 600);
      return;
    }
    const box = document.createElement('div');
    box.className = 'shards';
    Object.assign(box.style, {
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
    });
    // the panel exactly as it looks at the break; one synchronous capture (a few ms) shared by every shard
    const shot = o.snapshot()?.toDataURL('image/jpeg', 0.85) ?? '';
    for (const tri of triangles(4, 6)) box.appendChild(shard(tri, r, shot));
    document.body.appendChild(box);
    panel.style.visibility = 'hidden';
    const flash = document.createElement('div');
    flash.className = 'impactfx';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 90);
    dark.classList.add('on');
    setTimeout(() => location.assign(AWAKEN_URL), 1150);
  }

  function shard(t: Point[], r: DOMRect, shot: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'shard';
    el.style.clipPath = `polygon(${t.map(([x, y]) => `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`).join(',')})`;
    if (shot) el.style.backgroundImage = `url(${shot})`;
    else el.style.background = 'var(--ink)';
    const cx = (t[0][0] + t[1][0] + t[2][0]) / 3;
    const cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
    el.style.transformOrigin = `${(cx * 100).toFixed(1)}% ${(cy * 100).toFixed(1)}%`;
    const dx = cx - origin[0];
    const dy = cy - origin[1];
    const dist = Math.hypot(dx, dy) || 0.01;
    const push = 1.2 + Math.random() * 1.6;
    const tx = (dx / dist) * r.width * push * (0.6 + dist);
    const ty = (dy / dist) * r.height * push * (0.5 + dist) + r.height * 0.25;
    const tz = 300 + Math.random() * 600;
    const [rx, ry, rz] = [220, 220, 120].map((n) => (Math.random() - 0.5) * n);
    el.animate(
      [
        { transform: 'none', opacity: 1 },
        {
          transform: `translate3d(${tx.toFixed(0)}px, ${ty.toFixed(0)}px, ${tz.toFixed(0)}px) rotateX(${rx.toFixed(0)}deg) rotateY(${ry.toFixed(0)}deg) rotateZ(${rz.toFixed(0)}deg)`,
          opacity: 0,
        },
      ],
      { duration: 950 + Math.random() * 250, delay: dist * 140, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' },
    );
    return el;
  }

  panel.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    const r = panel.getBoundingClientRect();
    startHold([(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]);
  });
  addEventListener('pointerup', cancelHold);
  addEventListener('pointercancel', () => {
    cancelHold();
    held = false;
  });
  panel.addEventListener('contextmenu', (e) => e.preventDefault());
  // keyboard: holding Space or Enter cracks the panel like a held click; a short press opens the status card
  panel.addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (!e.repeat) startHold([0.5, 0.45]);
  });
  panel.addEventListener('keyup', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    const wasHeld = held;
    cancelHold();
    held = false;
    if (!wasHeld && !gone) o.onShortPress();
  });
  // back from Awaken with the back button: the page comes from the cache, so restore the panel
  addEventListener('pageshow', (e) => {
    setSwordCharge(0);
    if (!e.persisted) return;
    gone = false;
    held = false;
    panel.style.visibility = '';
    panel.style.transform = '';
    setCrack(0);
    dark.classList.remove('on');
    document.querySelectorAll('.shards').forEach((b) => b.remove());
  });

  return {
    isHolding: () => holding,
    /** true once after a hold, so the click that ends it does not also open the status card */
    consumeHeld: () => {
      const h = held;
      held = false;
      return h;
    },
  };
}
