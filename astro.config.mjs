// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Echte Domain — wird für SEO (Sitemap, Canonical-URLs, Open-Graph) verwendet.
export default defineConfig({
  site: 'https://www.ganzheitlich-vital-gesund.de',
  integrations: [sitemap()],
});
