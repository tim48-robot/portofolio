// The status sheet appears only once its frame image is decoded (so the text never shows without the frame):
// violet pixels gather into the sheet, then dissolve to reveal it, and the title rule draws from the centre.

import { sfx } from '../sfx';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function assemble(el: HTMLElement): void {
  el.style.visibility = 'visible';
  if (reduce) return;
  const cols = 12;
  const rows = 9;
  const grid = document.createElement('div');
  grid.className = 'pix';
  grid.style.gridTemplateColumns = `repeat(${cols},1fr)`;
  grid.style.gridTemplateRows = `repeat(${rows},1fr)`;
  const kids = [...el.children] as HTMLElement[];
  kids.forEach((k) => (k.style.opacity = '0'));
  el.style.background = 'transparent';
  const cells = Array.from({ length: cols * rows }, () => grid.appendChild(document.createElement('i')));
  el.appendChild(grid);
  cells.forEach((c) =>
    c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 90, delay: Math.random() * 260, fill: 'forwards' }),
  );
  setTimeout(() => {
    el.style.background = '';
    kids.forEach((k) => (k.style.opacity = ''));
    el.querySelector('.rule')?.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
      duration: 420,
      easing: 'cubic-bezier(.2,.8,.2,1)',
    });
    cells.forEach((c) =>
      c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, delay: Math.random() * 300, fill: 'forwards' }),
    );
    setTimeout(() => grid.remove(), 480);
    sfx.cardWhoosh();
  }, 380);
}

/** reveals the sheet after its frame has decoded, and not sooner than half a second after load */
export function revealSheet(el: HTMLElement, frameUrl: string): void {
  const t0 = performance.now();
  const go = () => setTimeout(() => assemble(el), Math.max(0, 500 - (performance.now() - t0)));
  const frame = new Image();
  frame.src = frameUrl;
  frame.decode().then(go, go);
}
