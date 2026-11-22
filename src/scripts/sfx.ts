// Site sound: Justin's audio files (card whoosh, shatter, explosion) plus a few sounds synthesised with Web Audio
// (click, glass crack, the eyes igniting, the charge hum). Off until the visitor turns it on; the choice is shared
// by both pages through localStorage. Everything goes through one bus with a light compressor and a short reverb.

const STORE_KEY = 'jt-sound';

let ctx: AudioContext | null = null;
let out: GainNode;
let wet: GainNode;
let noiseBuf: AudioBuffer;
let enabled = false;
let wanted: string[] = [];
let charge: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
const buffers = new Map<string, Promise<AudioBuffer>>();

try {
  enabled = localStorage.getItem(STORE_KEY) === 'on';
} catch {
  // storage blocked: sound simply starts off
}

function ensure(): AudioContext | null {
  if (!enabled) return null;
  if (!ctx) {
    ctx = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(comp).connect(ctx.destination);
    // a generated impulse response (stereo noise with a 1.6 s tail) is enough to put the synth sounds "in a room"
    const len = Math.floor(ctx.sampleRate * 1.6);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    wet = ctx.createGain();
    wet.gain.value = 0.5;
    wet.connect(conv).connect(out);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function send(node: AudioNode, rev: number): void {
  node.connect(out);
  if (rev > 0) {
    const r = ctx!.createGain();
    r.gain.value = rev;
    node.connect(r).connect(wet);
  }
}

function envelope(g: GainNode, t: number, attack: number, peak: number, decay: number): void {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(type: OscillatorType, f: number, t: number, a: number, peak: number, dec: number, rev = 0.3) {
  const o = ctx!.createOscillator();
  const g = ctx!.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  envelope(g, t, a, peak, dec);
  o.connect(g);
  send(g, rev);
  o.start(t);
  o.stop(t + a + dec + 0.05);
  return o;
}

function noise(t: number, dur: number, type: BiquadFilterType, f: number, q: number, peak: number, rev = 0.2): void {
  const s = ctx!.createBufferSource();
  const fl = ctx!.createBiquadFilter();
  const g = ctx!.createGain();
  s.buffer = noiseBuf;
  s.loop = true;
  fl.type = type;
  fl.frequency.setValueAtTime(f, t);
  fl.Q.value = q;
  envelope(g, t, 0.001, peak, dur);
  s.connect(fl).connect(g);
  send(g, rev);
  s.start(t, Math.random());
  s.stop(t + dur + 0.05);
}

function load(url: string): Promise<AudioBuffer> {
  let p = buffers.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${url}`);
        return r.arrayBuffer();
      })
      .then((b) => ctx!.decodeAudioData(b));
    // a failed load is forgotten so the next play tries again
    p.catch(() => buffers.delete(url));
    buffers.set(url, p);
  }
  return p;
}

function preload(url: string): void {
  if (ensure()) load(url).catch(() => undefined);
}

function play(url: string, vol: number, rev = 0.15): void {
  if (!ensure()) return;
  load(url)
    .then((buf) => {
      const s = ctx!.createBufferSource();
      const g = ctx!.createGain();
      s.buffer = buf;
      g.gain.value = vol;
      s.connect(g);
      send(g, rev);
      s.start();
    })
    .catch(() => undefined);
}

function stopCharge(): void {
  if (!charge || !ctx) return;
  const t = ctx.currentTime;
  const c = charge;
  charge = null;
  c.gain.gain.cancelScheduledValues(t);
  c.gain.gain.setTargetAtTime(0.0001, t, 0.04);
  c.src.stop(t + 0.25);
}

export const sfx = {
  get enabled(): boolean {
    return enabled;
  },
  /** the audio files this page plays; they are fetched as soon as sound is on */
  uses(list: string[]): void {
    wanted = list;
    if (enabled && ctx) list.forEach(preload);
  },
  setEnabled(on: boolean): void {
    enabled = on;
    try {
      localStorage.setItem(STORE_KEY, on ? 'on' : 'off');
    } catch {
      // not stored: the choice lasts for this page only
    }
    if (on) {
      ensure();
      wanted.forEach(preload);
    } else stopCharge();
  },
  /** browsers only start audio after a gesture; call from the first pointerdown */
  unlock(): void {
    if (ensure()) wanted.forEach(preload);
  },
  preload,
  click(): void {
    if (!ensure()) return;
    const t = ctx!.currentTime;
    tone('sine', 1650, t, 0.001, 0.09, 0.045, 0.05);
    noise(t, 0.012, 'highpass', 5000, 0.7, 0.05, 0);
  },
  /** one small glass crack, called repeatedly while the panel is held */
  crack(intensity: number): void {
    if (!ensure()) return;
    const t = ctx!.currentTime;
    noise(t, 0.02 + Math.random() * 0.02, 'highpass', 2500 + Math.random() * 2500, 0.8, 0.25 + intensity * 0.25, 0.25);
    for (const f of [3100, 4720, 6900]) {
      tone(
        'sine',
        f * (0.9 + Math.random() * 0.2),
        t,
        0.001,
        0.03 + intensity * 0.03,
        0.07 + Math.random() * 0.06,
        0.4,
      );
    }
  },
  /** the eyes igniting at full charge: a low thud with a short metallic ring */
  ignite(): void {
    if (!ensure()) return;
    const t = ctx!.currentTime;
    const th = tone('sine', 190, t, 0.003, 0.5, 0.3, 0.2);
    th.frequency.exponentialRampToValueAtTime(70, t + 0.25);
    [880, 1318, 2093].forEach((f, i) => tone('triangle', f, t + 0.005 * i, 0.002, 0.07, 0.35 + i * 0.1, 0.5));
    noise(t, 0.02, 'highpass', 3500, 0.7, 0.25, 0.1);
  },
  /** charging: a band of noise that rises and opens over 1.6 s */
  chargeStart(): void {
    if (!ensure()) return;
    stopCharge();
    const t = ctx!.currentTime;
    const src = ctx!.createBufferSource();
    const f = ctx!.createBiquadFilter();
    const gain = ctx!.createGain();
    src.buffer = noiseBuf;
    src.loop = true;
    f.type = 'bandpass';
    f.Q.value = 1.4;
    f.frequency.setValueAtTime(180, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + 1.6);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 1.6);
    src.connect(f).connect(gain).connect(out);
    src.start(t);
    charge = { src, gain };
  },
  chargeStop: stopCharge,
  cardWhoosh(): void {
    play('/sfx/card-whoosh.mp3', 0.85, 0.12);
  },
  shatter(): void {
    play('/sfx/shatter.mp3', 0.95);
  },
  explosion(strength: number): void {
    stopCharge();
    play('/sfx/explosion.mp3', 0.55 + 0.35 * Math.min(strength, 1), 0.2);
  },
};

/** wires a [data-sound-toggle] button: label, pressed state and the click sound */
export function bindSoundToggle(button: HTMLButtonElement): void {
  const label = () => {
    button.textContent = sfx.enabled ? 'Sound on' : 'Sound off';
    button.setAttribute('aria-pressed', String(sfx.enabled));
  };
  label();
  button.addEventListener('click', () => {
    sfx.setEnabled(!sfx.enabled);
    label();
    sfx.click();
  });
  addEventListener('pointerdown', () => sfx.unlock(), { once: true });
}
