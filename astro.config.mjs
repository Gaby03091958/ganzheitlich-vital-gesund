// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// WICHTIG: Hier später deine echte Domain eintragen — wird für SEO
// (Sitemap, Canonical-URLs, Open-Graph) verwendet.
export default defineConfig({
  site: 'https://ganzheitlich-vital-gesund.de',
  integrations: [sitemap()],
});
