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
# affiliate: true   # wenn der Artikel Werbelinks enthält (zeigt den Pflicht-Hinweis)
---

Hier dein Text in **Markdown**. Überschriften mit `##`, Listen mit `-` usw.
```

Übersicht, Startseite, Kategorie-Seiten, RSS-Feed und Sitemap aktualisieren sich
automatisch.

## Affiliate-Empfehlungskasten einfügen

In Artikeln mit Produktempfehlung (Waldkraft-Partnerprogramm) diesen Block ans
Artikelende setzen und im Frontmatter `affiliate: true` ergänzen:

```html
<div class="cta">
  <p class="cta__eyebrow">Meine Empfehlung</p>
  <h3 class="cta__title">Titel der Empfehlung</h3>
  <p>Kurzer, ehrlicher Empfehlungstext.</p>
  <p><a class="btn" href="https://www.waldkraft.bio/?sPartner=beste-gesundheit" target="_blank" rel="sponsored noopener">Zu den Produkten bei Waldkraft &rarr;</a></p>
  <p class="cta__code">Bei deiner Erstbestellung bekommst du <strong>10&nbsp;%&nbsp;Rabatt</strong> mit dem Gutscheincode <code>beste-gesundheit</code>.</p>
  <p class="cta__ad">Werbung · Partnerlink</p>
</div>
```

> **Wichtig:** Link (`?sPartner=…`) und Gutscheincode sind noch **Platzhalter**.
> Sobald der echte Partnerlink/Code von Waldkraft da ist (Bewerbung über
> waldkraft.bio/partnerfb), in allen Artikeln ersetzen — zu finden per Suche
> nach `sPartner`.

## Newsletter

Die Anmeldeformulare (Sidebar + unter jedem Artikel, Komponente
`src/components/NewsletterSignup.astro`) laufen über **Brevo** mit
**Double-Opt-in** — der Anmeldung folgt eine Bestätigungsmail, erst der Klick
darin trägt die Adresse in den Verteiler ein (rechtlich vorgeschrieben).

Zwei Funktionen im Ordner `api/` erledigen das:

| Datei | Adresse | Aufgabe |
| ----- | ------- | ------- |
| `api/newsletter.mjs` | `/api/newsletter` | nimmt das Formular an, legt den Kontakt an, schickt die Bestätigungsmail |
| `api/newsletter-bestaetigen.mjs` | `/api/newsletter-bestaetigen` | prüft den Link aus der Mail, trägt in Liste 3 ein |
| `api/_brevo.mjs` | — | gemeinsame Helfer (Unterstrich = keine eigene Adresse) |

Abgefragt werden **E-Mail** (Pflicht) und **Vorname** (freiwillig). Der Vorname
landet bei Brevo im Feld `VORNAME` und wird für die Anrede benutzt — die
Bestätigungsvorlage setzt dafür `{{ params.anrede }}` ein, was ohne Eingabe
schlicht „Hallo" ergibt und mit Eingabe „Hallo Gaby". Eine spätere Anmeldung
ohne Vornamen löscht einen früher gespeicherten Namen **nicht**.

Brevo-Seite: Liste **3** „Newsletter – Ganzheitlich vital & gesund",
Bestätigungsvorlage **1**, Absenderdomain ist authentifiziert (DKIM).
Nötige Umgebungsvariable bei Vercel: **`BREVO_API_KEY`**.

Ergebnisseiten: `/danke/` (bitte bestätigen) und `/newsletter-bestaetigt/`
(geschafft), bei kaputtem Link `/newsletter-link-ungueltig/`.

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
