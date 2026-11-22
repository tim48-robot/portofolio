import { defineConfig } from 'astro/config';

export default defineConfig({
  // the hero and Awaken pages are fully static; nothing needs a server
  output: 'static',
});
