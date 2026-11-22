/* Sword cursor shared by both pages.
   SwordCursor.init({ src, tip: [x, y] (0-1 inside the image), size, glow: 'r,g,b' })
   SwordCursor.charge(k)  0-1, how much the blade glows while something is held
   Rules it follows: the tip is the click point and never moves away from the pointer (no lag, no rotation);
   feedback happens around the tip, not by swinging the sword; touch screens and text fields keep the normal cursor. */
(() => {
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let el, img, cfg, x = -200, y = -200, k = 0, hot = 0, hotTo = 0, press = 0, raf = 0, shown = false;

  function init(o) {
    if (!fine || el) return;
    cfg = Object.assign({ size: 56, tip: [0, 0], glow: '164,123,255' }, o);
    const css = document.createElement('style');
    css.textContent = `
      html.sword, html.sword *{cursor:none!important}
      html.sword input, html.sword textarea, html.sword select, html.sword [contenteditable]{cursor:auto!important}
      .sword-cur{position:fixed;left:0;top:0;width:${cfg.size}px;height:${cfg.size}px;pointer-events:none;z-index:2147483000;opacity:0;transition:opacity .15s}
      .sword-cur.on{opacity:1}
      .sword-cur img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:0 0;transform-origin:${cfg.tip[0] * 100}% ${cfg.tip[1] * 100}%}
      .sword-ping{position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;pointer-events:none;z-index:2147482999;
        border:1.5px solid rgb(${cfg.glow});box-shadow:0 0 8px rgba(${cfg.glow},.6)}`;
    document.head.appendChild(css);
    el = document.createElement('div'); el.className = 'sword-cur'; el.setAttribute('aria-hidden', 'true');
    img = new Image(); img.alt = ''; img.decoding = 'async'; img.src = cfg.src; el.appendChild(img);
    img.onload = () => { document.body.appendChild(el); document.documentElement.classList.add('sword'); };

    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      if (!shown) { shown = true; el.classList.add('on'); }
      const t = e.target;
      el.style.visibility = t.closest && t.closest('input,textarea,select,[contenteditable]') ? 'hidden' : '';
      hotTo = t.closest && t.closest('a,button,[role="button"],label,summary,.panel,.hit') ? 1 : 0;   // over something you can press
      kick();
    }, { passive: true });
    document.addEventListener('pointerleave', () => { shown = false; el.classList.remove('on'); });
    addEventListener('blur', () => { shown = false; el.classList.remove('on'); });
    addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') return;
      press = 1; kick();
      if (reduce) return;
      // a small ring where the tip touched: the feedback lives at the click point
      const r = document.createElement('i'); r.className = 'sword-ping'; document.body.appendChild(r);
      r.animate([{ transform: `translate(${x}px,${y}px) scale(.3)`, opacity: .9 }, { transform: `translate(${x}px,${y}px) scale(1.6)`, opacity: 0 }],
        { duration: 380, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => r.remove();
    });
    addEventListener('pointerup', () => { press = 0; kick(); });
  }

  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame() {
    raf = 0;
    const hx = cfg.tip[0] * cfg.size, hy = cfg.tip[1] * cfg.size;
    hot += (hotTo - hot) * (reduce ? 1 : .3);
    el.style.transform = `translate3d(${(x - hx).toFixed(1)}px,${(y - hy).toFixed(1)}px,0)`;
    // scales around the tip, so the click point stays exactly under the pointer
    const sc = 1 + hot * .08 - press * .1 + k * .06;
    img.style.transform = `scale(${sc.toFixed(3)})`;
    const lit = Math.max(hot * .35, k);
    img.style.filter = lit > .01
      ? `drop-shadow(0 0 ${(2 + lit * 7).toFixed(1)}px rgba(${cfg.glow},${(.35 + lit * .55).toFixed(2)})) brightness(${(1 + lit * .25).toFixed(2)})`
      : '';
    if (Math.abs(hotTo - hot) > .01) kick();
  }

  window.SwordCursor = { init, charge(v) { if (!el) return; k = Math.max(0, Math.min(1, v)); kick(); } };
})();
