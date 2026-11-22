// Optimised image URLs for the Awaken page. Used by awaken.astro, and by the hero so it can prefetch the very
// same files while the panel is being held. Server-side only (astro:assets).

import { getImage } from 'astro:assets';
import portrait from '../assets/me.png';
import background from '../assets/bg-b.webp';
import depth from '../assets/bg-b-depth.png';
import frame from '../assets/status-frame.png';

export async function awakenImages() {
  const [p, b, d, f] = await Promise.all([
    getImage({ src: portrait, format: 'webp', quality: 90 }),
    getImage({ src: background, format: 'webp', quality: 90 }),
    // the parallax only needs a soft depth map; 512 px wide is the detail the shader used to read from mip level 1
    getImage({ src: depth, format: 'webp', quality: 85, width: 512 }),
    getImage({ src: frame, format: 'webp', quality: 90 }),
  ]);
  return { portrait: p.src, background: b.src, depth: d.src, frame: f.src };
}
