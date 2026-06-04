// Kategorien des Blogs. slug = URL-Teil (/kategorie/<slug>/),
// muss mit dem "category"-Feld in den Markdown-Artikeln übereinstimmen.
export const CATEGORIES: { slug: string; title: string; intro: string }[] = [
  {
    slug: 'wasserfreie-kosmetik',
    title: 'Wasserfreie Kosmetik',
    intro:
      'Pflege ganz ohne Wasser – konservierungsmittelfrei, ergiebig und hautfreundlich. Hier findest du Rezepte und Wissen rund um wasserfreie Kosmetik.',
  },
  {
    slug: 'entgiften',
    title: 'Entgiften',
    intro:
      'Sanfte Wege, deinen Körper bei der natürlichen Entgiftung zu unterstützen – von der Ernährung bis zu kleinen Ritualen im Alltag.',
  },
  {
    slug: 'ganzheitliche-gesundheit',
    title: 'Ganzheitliche Gesundheit',
    intro:
      'Körper, Geist und Haut hängen zusammen. Beiträge über das große Ganze: Ernährung, Lebensstil und natürliches Wohlbefinden.',
  },
  {
    slug: 'naturkosmetik',
    title: 'Naturkosmetik',
    intro:
      'Schöne Haut mit dem, was die Natur schenkt. Inhaltsstoffe, DIY-Rezepte und Hintergrundwissen zu echter Naturkosmetik.',
  },
  {
    slug: 'achtsamkeit',
    title: 'Achtsamkeit',
    intro:
      'Zur Ruhe kommen, bewusst leben, Schönheit von innen. Impulse für mehr Achtsamkeit im Alltag.',
  },
];

export function getCategory(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}
