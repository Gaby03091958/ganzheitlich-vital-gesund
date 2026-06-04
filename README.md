# Ganzheitlich vital & gesund

Blog-Website im Stil von [krautundtier.de](https://krautundtier.de) – gebaut mit
[Astro](https://astro.build). Schriften: **Cabin** + **Roboto Slab**.
Akzentfarbe: Pink `#ef4297`.

## Starten

> Voraussetzung: Node.js ist installiert (liegt unter `~/.local/node`, ist bereits im PATH).

```bash
cd "ganzheitlich-vital-gesund"
npm run dev      # Entwicklungsserver auf http://localhost:4321
npm run build    # fertige Seite in ./dist erzeugen
npm run preview  # die gebaute Seite lokal ansehen
```

## Neuen Blog-Artikel schreiben

Lege einfach eine neue `.md`-Datei in `src/content/blog/` an, z. B. `mein-artikel.md`:

```markdown
---
title: "Titel des Artikels"
description: "Kurzer Teaser (wird in Vorschau & SEO genutzt)."
pubDate: 2026-06-04
category: "naturkosmetik"   # muss zu einem Slug in src/categories.ts passen
heroAlt: "Beschreibung des Titelbilds"
# heroImage: "/bilder/mein-bild.jpg"   # optional: echtes Bild statt Platzhalter
---

Hier dein Text in **Markdown**. Überschriften mit `##`, Listen mit `-` usw.
```

Übersicht, Startseite, Kategorie-Seiten, RSS-Feed und Sitemap aktualisieren sich
automatisch.

## Bilder einsetzen (Platzhalter ersetzen)

Überall, wo aktuell ein gestreifter **Bild-Platzhalter** mit „📷"-Label steht,
kommt später dein echtes Bild hin:

1. Lege deine Bilder in `public/bilder/` ab (Ordner ggf. anlegen).
2. **Im Blog-Artikel:** trage im Frontmatter `heroImage: "/bilder/dateiname.jpg"` ein.
3. **Im Fließtext eines Artikels:** ersetze die Platzhalterzeile
   `![Platzhalter: ...](#)` durch `![Bildbeschreibung](/bilder/dateiname.jpg)`.
4. **Auf der Startseite / Über-mich-Seite:** in der jeweiligen `.astro`-Datei beim
   `<ImagePlaceholder ... />` ein `src="/bilder/dateiname.jpg"` ergänzen.

## Texte & Struktur anpassen

| Was | Datei |
|-----|-------|
| Seitenname, Tagline, Navigation, Autor-Bio | `src/consts.ts` |
| Kategorien (Name, URL, Einleitung) | `src/categories.ts` |
| Farben & Schriften | `src/styles/global.css` (oben die `:root`-Variablen) |
| Domain (für SEO/Sitemap) | `astro.config.mjs` **und** `src/consts.ts` |
| Über mich / Kontakt / Impressum / Datenschutz | `src/pages/*.astro` |

## Was noch zu tun ist (Platzhalter)

- [ ] Echte Bilder einsetzen
- [ ] Impressum & Datenschutz mit echten Daten füllen
- [ ] Kontaktformular an einen Versand-Dienst anbinden (z. B. Formspree)
- [ ] Echte Domain in `astro.config.mjs` + `src/consts.ts` eintragen
- [ ] Google Fonts ggf. lokal einbinden (Datenschutz)
