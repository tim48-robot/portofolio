// The panel's lens: a soft circle of full colour over the screentone print that follows the pointer and drifts on
// its own when nobody points. Both pictures are static images (tools/make-panel.py); the lens is a CSS mask moved
// with custom properties, so animating it costs the main thread almost nothing.

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface PanelArt {
  /** the panel as it looks right now (screentone plus the lens), for the shatter shards */
  snapshot: () => HTMLCanvasElement | null;
}

export function initPanelArt(
  panel: HTMLElement,
  tone: HTMLImageElement,
  lens: HTMLImageElement,
  isHolding: () => boolean,
): PanelArt {
  // lens state, in panel fractions; the radius is a fraction of the panel width
  let lx = 0.5;
  let ly = 0.3;
  let tx = 0.5;
  let ty = 0.3;
  let rad = 0.26;
  let trad = 0.26;
  let pointing = false;
  let t0 = performance.now();

  function place(): void {
    lens.style.setProperty('--lx', `${(lx * 100).toFixed(2)}%`);
    lens.style.setProperty('--ly', `${(ly * 100).toFixed(2)}%`);
    lens.style.setProperty('--lr', `${(rad * lens.clientWidth).toFixed(1)}px`);
  }

  let visible = true;
  let raf = 0;
  function loop(now: number): void {
    raf = 0;
    if (!pointing) {
      const t = (now - t0) / 1000;
      tx = 0.5 + Math.sin(t * 0.5) * 0.26;
      ty = 0.55 + Math.sin(t * 0.37 + 1) * 0.22;
    }
    lx += (tx - lx) * 0.12;
    ly += (ty - ly) * 0.12;
    rad += (trad - rad) * 0.1;
    place();
    kick();
  }
  function kick(): void {
    if (!raf && visible && !reduce) raf = requestAnimationFrame(loop);
  }

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    kick();
  }).observe(panel);
  place();
  kick();

  panel.addEventListener('pointermove', (e) => {
    const r = panel.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    pointing = true;
    tx = px;
    ty = py;
    trad = 0.3;
    if (reduce) {
      // no animation loop: the lens just sits under the pointer
      lx = px;
      ly = py;
      rad = trad;
      place();
      return;
    }
    if (!isHolding()) {
      panel.classList.add('tilting');
      panel.style.transform = `rotateY(${(px - 0.5) * 14}deg) rotateX(${(0.5 - py) * 10}deg)`;
      panel.style.boxShadow = `${10 - (px - 0.5) * 14}px ${10 + (py - 0.5) * 10}px 0 var(--ink)`;
    }
    kick();
  });
  panel.addEventListener('pointerleave', () => {
    pointing = false;
    trad = 0.26;
    t0 = performance.now() - 3000;
    panel.classList.remove('tilting');
    panel.style.transform = '';
    panel.style.boxShadow = '';
  });

  return {
    snapshot(): HTMLCanvasElement | null {
      if (!tone.complete || !lens.complete || !tone.naturalWidth) return null;
      const W = tone.naturalWidth;
      const H = tone.naturalHeight;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const lensCut = document.createElement('canvas');
      lensCut.width = W;
      lensCut.height = H;
      const m = lensCut.getContext('2d')!;
      const R = rad * W;
      const gr = m.createRadialGradient(lx * W, ly * H, R * 0.55, lx * W, ly * H, R);
      gr.addColorStop(0, 'rgba(0,0,0,1)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      m.drawImage(lens, 0, 0);
      m.globalCompositeOperation = 'destination-in';
      m.fillStyle = gr;
      m.fillRect(0, 0, W, H);
      const g = c.getContext('2d')!;
      g.drawImage(tone, 0, 0);
      g.drawImage(lensCut, 0, 0);
      return c;
    },
  };
}
