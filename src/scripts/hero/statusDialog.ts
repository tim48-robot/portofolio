// The status card: stamps onto the page, makes the rest of the page inert while open, Escape closes it from
// anywhere, and focus goes back to whatever opened it.

import { sfx } from '../sfx';

export function initStatusDialog(): { open: (e?: Event) => void } {
  const status = document.getElementById('status')!;
  const veil = document.getElementById('veil')!;
  const close = document.getElementById('close')!;
  const background = () => document.querySelectorAll<HTMLElement>('header, main, footer');
  let lastFocus: HTMLElement | null = null;

  function open(e?: Event): void {
    e?.preventDefault();
    lastFocus = document.activeElement as HTMLElement | null;
    status.hidden = false;
    background().forEach((el) => (el.inert = true));
    requestAnimationFrame(() => {
      status.classList.add('open');
      veil.classList.add('open');
      close.focus({ preventScroll: true });
    });
    sfx.cardWhoosh();
  }

  function shut(): void {
    if (status.hidden) return;
    background().forEach((el) => (el.inert = false));
    status.classList.remove('open');
    veil.classList.remove('open');
    setTimeout(() => {
      if (!status.classList.contains('open')) status.hidden = true;
    }, 450);
    lastFocus?.focus({ preventScroll: true });
  }

  close.addEventListener('click', shut);
  veil.addEventListener('click', shut);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') shut();
  });
  document.querySelectorAll('[data-open-status]').forEach((el) => el.addEventListener('click', open));
  return { open };
}
