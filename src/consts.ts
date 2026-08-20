// Zentrale Seiten-Konfiguration — hier die meisten Texte bequem anpassen.

export const SITE = {
  name: 'Ganzheitlich vital & gesund',
  tagline: 'Natürliche Schönheit & ganzheitliche Gesundheit – ohne Chemie',
  description:
    'Blog rund um ganzheitliche Gesundheit und Naturkosmetik: wasserfreie Kosmetik, Entgiften und natürliche Schönheit ohne Chemie – von einer gelernten Kosmetikerin.',
  // Später die echte Domain eintragen (auch in astro.config.mjs):
  url: 'https://ganzheitlich-vital-gesund.de',
  author: 'Gaby',
};

// Hauptnavigation (Reihenfolge = Anzeige im Menü)
export const NAV: { label: string; href: string }[] = [
  { label: 'Start', href: '/' },
  { label: 'Blog', href: '/blog/' },
  { label: 'Wasserfreie Kosmetik', href: '/kategorie/wasserfreie-kosmetik/' },
  { label: 'Entgiften', href: '/kategorie/entgiften/' },
  { label: 'Ganzheitliche Gesundheit', href: '/kategorie/ganzheitliche-gesundheit/' },
  { label: 'Naturkosmetik', href: '/kategorie/naturkosmetik/' },
  { label: 'Achtsamkeit', href: '/kategorie/achtsamkeit/' },
  { label: 'Über mich', href: '/ueber-mich/' },
  { label: 'Kontakt', href: '/kontakt/' },
];

// Kurzbio für die Sidebar-Autorenbox
export const AUTHOR = {
  name: 'Gaby',
  role: 'Gelernte Kosmetikerin',
  bio: 'Ich befasse mich seit Jahren mit natürlicher Schönheit ganz ohne Chemie. Als gelernte Kosmetikerin zeige ich dir hier, wie ganzheitliche Gesundheit, wasserfreie Kosmetik und sanftes Entgiften zusammenspielen.',
};
