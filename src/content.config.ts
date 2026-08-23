import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Blog-Sammlung: jede Markdown-Datei in src/content/blog/ wird ein Artikel.
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    // muss zu einem Kategorie-Slug passen (siehe src/categories.ts)
    category: z.string(),
    // Beschriftung des Bild-Platzhalters (später durch echtes Bild ersetzbar)
    heroAlt: z.string().default('Platzhalterbild'),
    // optional: Pfad zu einem echten Bild in /public, z. B. '/bilder/artikel.jpg'
    heroImage: z.string().optional(),
    // true, wenn der Artikel Affiliate-/Werbelinks enthält
    // (zeigt automatisch den Pflicht-Hinweis am Artikelanfang)
    affiliate: z.boolean().default(false),
  }),
});

export const collections = { blog };
