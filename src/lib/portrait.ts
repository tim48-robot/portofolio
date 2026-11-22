// Where Justin's face is, in one place, for the Awaken shader. (The hero panel is rendered offline by
// tools/make-panel.py with its own placement.) If the portrait is re-cut, only these numbers change.

export const PORTRAIT = {
  width: 1086,
  height: 1449,
  /** pupil centres in source pixels */
  eyes: { left: [498, 253], right: [603, 253] },
} as const;

export interface Placement {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Awaken: the padded square-ish canvas the shader samples (matches the .stage aspect of 6:7) */
export const AURA_CANVAS = { width: 1200, height: 1400 } as const;

/** Awaken: the portrait is drawn larger than its box so the face reads well; the waist runs off the bottom */
export function placeInAuraCanvas(imgW: number, imgH: number): Placement {
  const scale = (1020 / imgH) * 1.55;
  const width = imgW * scale;
  const height = imgH * scale;
  return { x: (AURA_CANVAS.width - width) / 2, y: 330 - imgH * 0.069 * scale, width, height };
}

/** both pupils in the Awaken shader's portrait uv space (origin bottom-left): [lx, ly, rx, ry] */
export function eyesInAuraUv(): [number, number, number, number] {
  const p = placeInAuraCanvas(PORTRAIT.width, PORTRAIT.height);
  const s = p.width / PORTRAIT.width;
  const uv = ([ex, ey]: readonly [number, number]): [number, number] => [
    (p.x + ex * s) / AURA_CANVAS.width,
    1 - (p.y + ey * s) / AURA_CANVAS.height,
  ];
  return [...uv(PORTRAIT.eyes.left), ...uv(PORTRAIT.eyes.right)];
}
