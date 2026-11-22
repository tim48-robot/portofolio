/* Portfolio sound: Justin's audio files (card whoosh, shatter, explosion) plus a few sounds synthesised with Web Audio
   (click, crack, the charge hum). Everything goes through one bus with a light compressor and a generated reverb.
   Sound is off until SFX.setEnabled(true) is called from a click. Each page lists its files with SFX.uses([...]),
   and they are fetched as soon as sound is switched on. The other synth sounds and SFX.v1 are only used by sound-lab. */
(() => {
  let ctx = null, out = null, wet = null, enabled = false, chargeNodes = null, noiseBuf = null;
  try { enabled = localStorage.getItem('jt-sound') === 'on'; } catch (e) {}

  function ensure() {
    if (!enabled) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .2;
      out = ctx.createGain(); out.gain.value = .9;
      out.connect(comp).connect(ctx.destination);
      // generated impulse response: stereo noise with an exponential tail (about 1.6 s)
      const len = Math.floor(ctx.sampleRate * 1.6), ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
      const conv = ctx.createConvolver(); conv.buffer = ir;
      wet = ctx.createGain(); wet.gain.value = .5;
      wet.connect(conv).connect(out);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const now = () => ctx.currentTime;
  function send(node, dry = 1, rev = .3) {
    const d = ctx.createGain(); d.gain.value = dry; node.connect(d).connect(out);
    if (rev > 0) { const r = ctx.createGain(); r.gain.value = rev; node.connect(r).connect(wet); }
  }
  function env(g, t, a, peak, dec, hold = 0) {
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    if (hold) g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.exponentialRampToValueAtTime(.0001, t + a + hold + dec);
  }
  function tone(type, f, t, a, peak, dec, rev = .3, detune = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    env(g, t, a, peak, dec); o.connect(g); send(g, 1, rev);
    o.start(t); o.stop(t + a + dec + .05);
    return o;
  }
  function noise(t, dur, type, f, q, peak, a = .002, rev = .2) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true; fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    env(g, t, a, peak, dur); s.connect(fl).connect(g); send(g, 1, rev);
    s.start(t, Math.random()); s.stop(t + a + dur + .05);
    return { s, fl, g };
  }

  // audio files: decoded once, played through the same bus. Loops use an AudioBuffer so they repeat with no gap
  const buffers = {};
  function load(url) {
    if (!buffers[url]) buffers[url] = fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(b => new Promise((res, rej) => ctx.decodeAudioData(b, res, rej)))
      .catch(e => { delete buffers[url]; throw e; });                      // a failed load is retried next time
    return buffers[url];
  }
  let loopSrc = null, loopGain = null, wanted = [];

  const SFX = {
    get enabled() { return enabled; },
    uses(list) { wanted = list; if (enabled && ctx) list.forEach(u => SFX.preload(u)); },
    preload(url) { if (ensure()) load(url).catch(() => {}); },
    play(url, { vol = .9, rev = .15 } = {}) {
      if (!ensure()) return;
      load(url).then(buf => { const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; g.gain.value = vol; s.connect(g); send(g, 1, rev); s.start(); }).catch(() => {});
    },
    loopStart(url, { vol = .8, fade = .25 } = {}) {
      if (!ensure()) return; SFX.loopStop();
      const g = ctx.createGain(); loopGain = g; g.gain.setValueAtTime(.0001, now()); g.gain.exponentialRampToValueAtTime(vol, now() + fade); send(g, 1, .2);
      load(url).then(buf => { if (loopGain !== g) return; const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(g); s.start(); loopSrc = s; }).catch(() => {});
    },
    loopStop() {
      if (!loopGain || !ctx) return; const t = now(), g = loopGain, s = loopSrc; loopGain = null; loopSrc = null;
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(g.gain.value, .0001), t); g.gain.exponentialRampToValueAtTime(.0001, t + .1);
      if (s) s.stop(t + .15);
    },
    setEnabled(v) { enabled = !!v; try { localStorage.setItem('jt-sound', enabled ? 'on' : 'off'); } catch (e) {} if (enabled) { ensure(); wanted.forEach(u => SFX.preload(u)); } else SFX.chargeStop(); },
    unlock() { if (ensure()) wanted.forEach(u => SFX.preload(u)); },

    // the mask locking onto the face: a heavy low thud with a short metallic ring
    maskLock() {
      if (!ensure()) return; const t = now();
      const th = tone('sine', 190, t, .003, .5, .3, .2); th.frequency.exponentialRampToValueAtTime(70, t + .25);
      [880, 1318, 2093].forEach((f, i) => tone('triangle', f, t + .005 * i, .002, .07, .35 + i * .1, .5));
      noise(t, .02, 'highpass', 3500, .7, .25, .001, .1);
    },
    // Justin's own files: the card whoosh when a status card opens, the explosion when a charge is released
    cardWhoosh() { SFX.play('sfx/card-whoosh-b.mp3', { vol: .85, rev: .12 }); },
    explosion(strength = 1) { SFX.v1.chargeStop(); SFX.chargeStop(); SFX.play('sfx/explosion-yours.mp3', { vol: .55 + .35 * Math.min(strength, 1), rev: .2 }); },

    // the "system window" ding: a glassy two-note bell (inharmonic partials) with a reverb tail
    ding() {
      if (!ensure()) return; const t = now();
      const bell = (f, t0, v) => [[1, 1, 1.4], [2.76, .5, .7], [5.4, .25, .4], [8.93, .12, .25]].forEach(([r, a, d]) => tone('sine', f * r, t0, .004, v * a, d, .55));
      bell(1318.5, t, .2); bell(1975.5, t + .085, .13);
      tone('triangle', 2637, t, .002, .03, .08, .2);
    },
    // soft button click
    click() {
      if (!ensure()) return; const t = now();
      tone('sine', 1650, t, .001, .09, .045, .05);
      noise(t, .012, 'highpass', 5000, .7, .05, .001, 0);
    },
    // premium card flip: a paper snap followed by a light shimmer
    cardFlip() {
      if (!ensure()) return; const t = now();
      const sw = noise(t, .16, 'bandpass', 900, 1.2, .25, .01, .1);
      sw.fl.frequency.exponentialRampToValueAtTime(4200, t + .14);
      noise(t + .13, .03, 'bandpass', 2600, 2, .35, .001, .15);
      for (let i = 0; i < 7; i++) tone('sine', 2800 + Math.random() * 4200, t + .15 + i * .03, .002, .045, .3, .7);
    },
    // one small glass crack (called repeatedly while holding the panel)
    crack(intensity = .5) {
      if (!ensure()) return; const t = now();
      noise(t, .02 + Math.random() * .02, 'highpass', 2500 + Math.random() * 2500, .8, .25 + intensity * .25, .001, .25);
      [3100, 4720, 6900].forEach(f => tone('sine', f * (.9 + Math.random() * .2), t, .001, .03 + intensity * .03, .07 + Math.random() * .06, .4));
    },
    // the panel breaks: low thump, burst, and a rain of glass pings
    shatter() {
      if (!ensure()) return; const t = now();
      const th = tone('sine', 110, t, .004, .7, .35, .2); th.frequency.exponentialRampToValueAtTime(38, t + .3);
      const b = noise(t, .5, 'bandpass', 1800, .6, .55, .002, .45); b.fl.frequency.exponentialRampToValueAtTime(5200, t + .4);
      noise(t, .08, 'highpass', 6000, .7, .4, .001, .2);
      for (let i = 0; i < 34; i++) { const tt = t + .02 + Math.pow(Math.random(), 1.8) * .75; tone('sine', 2400 + Math.random() * 6000, tt, .001, .02 + Math.random() * .05, .05 + Math.random() * .2, .6); }
    },
    // charging: two detuned saws rising under an opening filter, a rising noise band, and a tremolo that speeds up
    chargeStart() {
      if (!ensure()) return; SFX.chargeStop(); const t = now(), T = 1.6;
      const master = ctx.createGain(); master.gain.setValueAtTime(.0001, t); master.gain.exponentialRampToValueAtTime(.42, t + T);
      const trem = ctx.createGain(); trem.gain.value = .75;
      const lfo = ctx.createOscillator(), lfoAmt = ctx.createGain(); lfo.frequency.setValueAtTime(5, t); lfo.frequency.linearRampToValueAtTime(19, t + T); lfoAmt.gain.value = .25;
      lfo.connect(lfoAmt).connect(trem.gain);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 6; lp.frequency.setValueAtTime(260, t); lp.frequency.exponentialRampToValueAtTime(3400, t + T);
      const oscs = [-9, 9].map(dt => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.detune.value = dt; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(230, t + T); o.connect(lp); return o; });
      const ns = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
      ns.buffer = noiseBuf; ns.loop = true; bp.type = 'bandpass'; bp.Q.value = 3; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(4200, t + T); ng.gain.value = .35;
      ns.connect(bp).connect(ng).connect(trem);
      const sh = ctx.createOscillator(), shg = ctx.createGain(); sh.type = 'sine'; sh.frequency.setValueAtTime(1800, t); sh.frequency.exponentialRampToValueAtTime(3600, t + T); shg.gain.value = .05; sh.connect(shg).connect(trem);
      lp.connect(trem); trem.connect(master); send(master, 1, .35);
      [...oscs, ns, sh, lfo].forEach(n => n.start(t));
      chargeNodes = { master, nodes: [...oscs, ns, sh, lfo] };
    },
    chargeStop() {
      if (!chargeNodes || !ctx) return; const t = now(), c = chargeNodes; chargeNodes = null;
      c.master.gain.cancelScheduledValues(t); c.master.gain.setValueAtTime(Math.max(c.master.gain.value, .0001), t); c.master.gain.exponentialRampToValueAtTime(.0001, t + .08);
      c.nodes.forEach(n => n.stop(t + .12));
    },
    // release: sub boom, a punchy transient, a downward whoosh, all into the reverb
    release(strength = 1) {
      if (!ensure()) return; SFX.chargeStop(); const t = now(), k = Math.min(1.2, strength);
      const sub = tone('sine', 130, t, .003, .55 + .3 * k, .9, .25); sub.frequency.exponentialRampToValueAtTime(34, t + .7);
      noise(t, .1, 'lowpass', 1400, .7, .6 * k + .2, .001, .3);
      noise(t, .012, 'highpass', 4000, .7, .35, .001, .1);
      const w = noise(t + .03, .55, 'bandpass', 3200, 1.4, .22 * k, .02, .5); w.fl.frequency.exponentialRampToValueAtTime(260, t + .55);
    }
  };

  // the original version, kept so it can be compared in the sound lab
  SFX.v1 = {
    ding() { if (!ensure()) return; const t = now(); [[1318.5, .16], [1975.5, .07]].forEach(([f, v]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; env(g, t, .01, v, .9); o.connect(g).connect(out); o.start(t); o.stop(t + 1); }); },
    chargeStart() { if (!ensure()) return; SFX.v1.chargeStop(); const t = now(), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(180, t); f.frequency.exponentialRampToValueAtTime(2600, t + 1.6); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.3, t + 1.6); s.connect(f).connect(g).connect(out); s.start(t); SFX.v1._c = { s, g }; },
    chargeStop() { const c = SFX.v1._c; if (!c) return; SFX.v1._c = null; const t = now(); c.g.gain.cancelScheduledValues(t); c.g.gain.setTargetAtTime(.0001, t, .04); c.s.stop(t + .25); },
    release(k = 1) { if (!ensure()) return; SFX.v1.chargeStop(); const t = now(), o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(32, t + .6); env(g, t, .01, .45 + .35 * Math.min(k, 1), .9); o.connect(g).connect(out); o.start(t); o.stop(t + 1); noise(t, .55, 'lowpass', 3000, .7, .2 + .35 * Math.min(k, 1), .001, 0); }
  };

  window.SFX = SFX;
})();
