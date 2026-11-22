// Geometry for the panel shatter: the crack lines and the triangles the panel breaks into. Pure, no DOM.

export type Point = [number, number];

/** an SVG path of cracks running out from (x0, y0) in a w x h box, plus a ring of chips at the impact point */
export function crackPath(w: number, h: number, x0: number, y0: number): string {
  let d = '';
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + Math.random() * 0.5;
    const len = Math.max(w, h) * (0.35 + Math.random() * 0.4);
    let x = x0;
    let y = y0;
    d += `M${x.toFixed(1)} ${y.toFixed(1)}`;
    for (let k = 1; k <= 6; k++) {
      const aa = a + (Math.random() - 0.5) * 0.5;
      x = x0 + Math.cos(aa) * len * (k / 6);
      y = y0 + Math.sin(aa) * len * (k / 6);
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
      if (k === 3 && Math.random() > 0.4) {
        const b = aa + (Math.random() > 0.5 ? 0.7 : -0.7);
        d += ` M${x.toFixed(1)} ${y.toFixed(1)} L${(x + Math.cos(b) * len * 0.25).toFixed(1)} ${(y + Math.sin(b) * len * 0.25).toFixed(1)} M${x.toFixed(1)} ${y.toFixed(1)}`;
      }
    }
  }
  // a small ring of chips around the impact point
  const ring = Math.min(w, h) * 0.07;
  d += ` M${(x0 + ring).toFixed(1)} ${y0.toFixed(1)}`;
  for (let k = 1; k <= 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const rr = ring * (0.75 + Math.random() * 0.5);
    d += ` L${(x0 + Math.cos(a) * rr).toFixed(1)} ${(y0 + Math.sin(a) * rr).toFixed(1)}`;
  }
  return d;
}

/** a jittered grid of triangles covering the unit square */
export function triangles(cols: number, rows: number): Point[][] {
  const pts: Point[] = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const edgeX = i === 0 || i === cols;
      const edgeY = j === 0 || j === rows;
      pts.push([
        i / cols + (edgeX ? 0 : (Math.random() - 0.5) * 0.1),
        j / rows + (edgeY ? 0 : (Math.random() - 0.5) * 0.08),
      ]);
    }
  }
  const tris: Point[][] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = pts[j * (cols + 1) + i];
      const b = pts[j * (cols + 1) + i + 1];
      const c = pts[(j + 1) * (cols + 1) + i];
      const d = pts[(j + 1) * (cols + 1) + i + 1];
      if ((i + j) % 2) tris.push([a, b, d], [a, d, c]);
      else tris.push([a, b, c], [b, d, c]);
    }
  }
  return tris;
}
