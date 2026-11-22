import { initSwordCursor } from '../cursor';
import { bindSoundToggle, sfx } from '../sfx';
import { initPanelArt } from './panelArt';
import { initShatter } from './shatter';
import { initStatusDialog } from './statusDialog';

const panel = document.getElementById('panel')!;
const toastEl = document.getElementById('toast')!;
let toastTimer = 0;

function toast(message: string): void {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2400);
}

initSwordCursor({ src: '/cursors/sword-red.png', tip: [0.016, 0.017], size: 60, glow: '215,38,46' });
sfx.uses(['/sfx/card-whoosh.mp3', '/sfx/shatter.mp3']);
document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]').forEach(bindSoundToggle);
document.querySelectorAll('.dock a, .nav a').forEach((a) => a.addEventListener('click', () => sfx.click()));

const status = initStatusDialog();
// the art needs to know about a hold (no tilting meanwhile) and the hold needs the art (for the shards)
let holding = () => false;
const art = initPanelArt(
  panel,
  document.getElementById('art') as HTMLImageElement,
  document.getElementById('lens') as HTMLImageElement,
  () => holding(),
);
const hold = initShatter({
  panel,
  snapshot: art.snapshot,
  cracks: document.getElementById('cracks') as unknown as SVGSVGElement,
  dark: document.getElementById('dark')!,
  prefetch: (panel.dataset.prefetch ?? '').split(',').filter(Boolean),
  onShortPress: () => status.open(),
});
holding = hold.isHolding;
panel.addEventListener('click', (e) => {
  if (!hold.consumeHeld()) status.open(e);
});

try {
  if (localStorage.getItem('jt-visited')) setTimeout(() => toast('Welcome back.'), 1600);
  localStorage.setItem('jt-visited', '1');
} catch {
  // storage blocked: no welcome-back message
}

document.getElementById('copy')?.addEventListener('click', () => {
  const email = document.getElementById('email')!;
  const fallback = () => {
    const range = document.createRange();
    range.selectNodeContents(email);
    const sel = getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    toast('Selected. Press Ctrl+C.');
  };
  const text = email.textContent?.trim() ?? '';
  if (!navigator.clipboard) return fallback();
  navigator.clipboard.writeText(text).then(() => toast('Email copied.'), fallback);
});
