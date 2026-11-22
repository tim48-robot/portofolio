// Awaken: hover the portrait to wake the aura, hold to charge (the eyes and the rim light swell), release to burst.

import { initSwordCursor, setSwordCharge } from '../cursor';
import { bindSoundToggle, sfx } from '../sfx';
import { createAuraEngine } from './engine';
import { revealSheet } from './sheet';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const hero = document.getElementById('hero')!;
const cv = document.getElementById('gl') as HTMLCanvasElement;
const stage = document.getElementById('stage')!;
const hit = document.getElementById('hit')!;
const sheet = document.getElementById('sheet')!;
const inkBtn = document.getElementById('ink')!;
const auraPct = document.querySelector<HTMLElement>('[data-aura-pct]');

initSwordCursor({ src: '/cursors/sword-violet.png', tip: [0, 0], size: 58, glow: '190,150,255' });
sfx.uses(['/sfx/explosion.mp3', '/sfx/card-whoosh.mp3']);
document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]').forEach(bindSoundToggle);
document.getElementById('back')?.addEventListener('click', (e) => {
  // came from the hero: go back in history so the hero restores from the cache
  if (history.length > 1) {
    e.preventDefault();
    history.back();
  }
});
revealSheet(sheet, sheet.dataset.frame ?? '');

const gl = cv.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false });
if (!gl) {
  // no aura without WebGL2, but the page still works: a still background, the status sheet, sound
  hero.classList.add('nogl-on');
  inkBtn.hidden = true;
} else {
  run(gl);
  // phones drop the GL context after time in the background; without this the canvas would stay black
  cv.addEventListener('webglcontextlost', (e) => e.preventDefault());
  cv.addEventListener('webglcontextrestored', () => location.reload());
}

function run(gl: WebGL2RenderingContext): void {
  const engine = createAuraEngine(gl, cv, hero, stage);
  void engine.loadImages({
    portrait: cv.dataset.portrait ?? '',
    background: cv.dataset.background ?? '',
    depth: cv.dataset.depth ?? '',
  });

  let ink = true;
  inkBtn.addEventListener('click', () => {
    ink = !ink;
    inkBtn.textContent = ink ? 'Ink on' : 'Ink off';
    inkBtn.setAttribute('aria-pressed', String(ink));
  });

  // interaction state
  let hovering = false;
  let touched = false;
  let charging = false;
  let charge = 0;
  let released = false;
  let power = 0;
  let burst = 0;
  let shock = 0;
  let shockPos: [number, number] = [0, 0];
  let impactAt = -1;
  let mouse: [number, number] = [0, 0];
  let glow = 0;
  let afterglow = 0;
  let eyesLit = false;

  function startCharge(): void {
    if (charging) return;
    charging = true;
    sfx.chargeStart();
  }

  function release(): void {
    if (!charging) return;
    charging = false;
    const strength = 0.45 + charge * 0.9;
    released = true;
    afterglow = Math.max(afterglow, 0.5 + charge * 0.7);
    burst = Math.min(1.2, strength);
    shock = 0.0001;
    impactAt = performance.now();
    shockPos = engine.figureCenter();
    power = Math.min(power + 0.2 + charge * 0.35, 1.25);
    charge = 0;
    setSwordCharge(0);
    if (!reduce) {
      cv.classList.remove('shake');
      void cv.offsetWidth;
      cv.classList.add('shake');
    }
    focusLines(strength);
    sfx.explosion(strength);
    navigator.vibrate?.(40 + strength * 60);
  }

  // manga focus lines bursting out from the figure
  function focusLines(strength: number): void {
    const r = cv.getBoundingClientRect();
    const [bx, by] = engine.figureCenter();
    const el = document.createElement('div');
    el.className = 'burst';
    el.style.left = `${bx / engine.scale}px`;
    el.style.top = `${r.height - by / engine.scale}px`;
    el.style.setProperty('--s', (1 + strength * 0.45).toFixed(2));
    hero.appendChild(el);
    setTimeout(() => el.remove(), 750);
  }

  hit.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse') hovering = true;
  });
  hit.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') hovering = false;
  });
  hit.addEventListener('pointerdown', (e) => {
    touched ||= e.pointerType !== 'mouse';
    hit.setPointerCapture(e.pointerId);
    e.preventDefault();
    startCharge();
  });
  addEventListener('pointerup', release);
  addEventListener('pointercancel', () => {
    charging = false;
    charge = 0;
    sfx.chargeStop();
  });
  addEventListener('pointermove', (e) => (mouse = engine.toBuffer(e.clientX, e.clientY)), { passive: true });
  // keyboard: focus is hover, holding Space or Enter charges
  hit.addEventListener('focus', () => (hovering = true));
  hit.addEventListener('blur', () => {
    hovering = false;
    release();
  });
  hit.addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (!e.repeat) startCharge();
  });
  hit.addEventListener('keyup', (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    release();
  });

  let last = performance.now();
  const t0 = last;
  let labelT = 0;
  let lastP = '';
  let lastC = '';

  function frame(now: number): void {
    const raw = (now - last) / 1000;
    const dt = Math.min(0.05, raw);
    last = now;
    const t = (now - t0) / 1000;

    if (charging) charge = Math.min(1, charge + dt / 1.6);
    // eyes and rim: rise with the charge, flare at the release, then settle to a faint glow once awakened
    afterglow = Math.max(0, afterglow - dt / 1.6);
    const idle = released ? 0.16 + 0.04 * Math.sin(t * 2.2) : 0;
    const want = charging ? 0.12 + 0.88 * Math.pow(charge, 1.4) : Math.max(idle, afterglow);
    glow += (want - glow) * (1 - Math.exp(-dt * (want > glow ? 10 : 3)));
    if (charging && charge > 0.97 && !eyesLit) {
      eyesLit = true;
      sfx.ignite();
    }
    if (!charging) eyesLit = false;
    const goal = charging ? 0.75 + charge * 0.65 : hovering || touched ? 0.72 : 0.07;
    power += (goal - power) * (1 - Math.exp(-dt * (goal > power ? 3.2 : 1.6)));
    burst *= Math.exp(-dt * 3.2);
    if (shock > 0) {
      shock += dt / 1.1;
      if (shock >= 1) shock = 0;
    }
    const since = now - impactAt;
    // two inverted manga frames on impact; skipped for reduced motion (flash risk)
    const impact = !reduce && impactAt > 0 && (since < 70 || (since > 120 && since < 165));

    const p = Math.min(power, 1).toFixed(2);
    const c = charge.toFixed(2);
    if (p !== lastP) root.style.setProperty('--p', (lastP = p));
    if (c !== lastC) root.style.setProperty('--charge', (lastC = c));
    if (charging) setSwordCharge(charge);
    if (auraPct && now - labelT > 500) {
      labelT = now;
      auraPct.textContent = `${Math.round(Math.max(0, Math.min(power, 1.7)) * 100)}%`;
    }

    // the first second holds shader compiles and uploads, so it is not measured
    if (t > 1) engine.measure(raw);
    engine.render({ t, power, burst, shock, shockPos, mouse, glow, impact, ink });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
