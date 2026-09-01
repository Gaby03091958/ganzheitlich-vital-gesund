// Besucherstatistik, Schritt 2: Auswerten.
//
// Liest die Zähl-Dateien aus dem privaten Blob-Speicher, verdichtet
// abgeschlossene Tage zu je einem Eintrag in tage.json (die Einzel-Dateien
// werden danach gelöscht) und liefert alles als JSON an /statistik/.
//
// Zugang nur mit dem Statistik-Schlüssel (Umgebungsvariable STATISTIK_TOKEN).
// Personenbezogenes wird hier nicht verarbeitet – es gibt schlicht keins.

import { list, put, del } from '@vercel/blob';
import { BREVO, brevo, sendeJson } from './_brevo.mjs';
import { heuteAthen } from './zaehl.mjs';

const MAX_EREIGNISSE = 3000; // Obergrenze pro Aufruf, damit die Funktion flott bleibt.

function leererTag() {
  return { aufrufe: 0, besuche: 0, seiten: {}, quellen: {}, laender: {}, klicks: {}, klickSeiten: {}, pins: {} };
}

/** Referrer-Hostname zu einer lesbaren Quellen-Gruppe. */
function quellenGruppe(host) {
  if (!host) return 'Direkt';
  if (host.includes('ganzheitlich-vital-gesund')) return null; // interne Navigation
  if (host.includes('pinterest')) return 'Pinterest';
  if (host.includes('google')) return 'Google';
  if (host.includes('bing')) return 'Bing';
  if (host.includes('duckduckgo')) return 'DuckDuckGo';
  if (host.includes('ecosia')) return 'Ecosia';
  if (host.includes('facebook') || host === 'fb.com' || host === 'm.facebook.com') return 'Facebook';
  if (host.includes('instagram')) return 'Instagram';
  if (host === 't.co' || host.includes('twitter') || host === 'x.com') return 'X (Twitter)';
  if (host.includes('brevo') || host.includes('sendinblue')) return 'Newsletter';
  return host;
}

function zaehle(ziel, schluessel, plus = 1) {
  if (!schluessel) return;
  ziel[schluessel] = (ziel[schluessel] || 0) + plus;
}

/** Ein einzelnes Zähl-Ereignis in die Tagessumme einrechnen. */
function einrechnen(tag, e) {
  if (e.art === 'klick') {
    zaehle(tag.klicks, e.ziel || 'unbekannt');
    zaehle(tag.klickSeiten, e.pfad);
    return;
  }
  tag.aufrufe += 1;
  zaehle(tag.seiten, e.pfad);
  zaehle(tag.laender, e.land);
  if (e.pin) zaehle(tag.pins, e.pin);
  if (e.neu) {
    tag.besuche += 1;
    zaehle(tag.quellen, quellenGruppe(e.quelle));
  }
}

/** Zwei Tagessummen zusammenführen (für die Verdichtung). */
function verschmelzen(a, b) {
  a.aufrufe += b.aufrufe;
  a.besuche += b.besuche;
  for (const feld of ['seiten', 'quellen', 'laender', 'klicks', 'klickSeiten', 'pins']) {
    for (const [k, n] of Object.entries(b[feld] || {})) zaehle(a[feld], k, n);
  }
  return a;
}

async function blobLesen(url) {
  const antwort = await fetch(url, {
    headers: { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });
  if (!antwort.ok) throw new Error(`Blob-Lesen fehlgeschlagen: ${antwort.status}`);
  return antwort.json();
}

/** Alle Blobs unter einem Präfix auflisten (mit Blätter-Cursor). */
async function alleAuflisten(prefix) {
  const blobs = [];
  let cursor;
  do {
    const seite = await list({ prefix, cursor, limit: 1000 });
    blobs.push(...seite.blobs);
    cursor = seite.hasMore ? seite.cursor : undefined;
  } while (cursor && blobs.length < MAX_EREIGNISSE);
  return blobs;
}

/** Mehrere Blobs parallel lesen, aber höchstens 20 gleichzeitig. */
async function gebuendeltLesen(blobs) {
  const ergebnisse = [];
  for (let i = 0; i < blobs.length; i += 20) {
    const stueck = await Promise.all(
      blobs.slice(i, i + 20).map((b) =>
        blobLesen(b.url).then(
          (daten) => ({ pathname: b.pathname, daten }),
          () => null // eine kaputte Datei soll nicht alles stoppen
        )
      )
    );
    ergebnisse.push(...stueck.filter(Boolean));
  }
  return ergebnisse;
}

async function abonnentenZahl() {
  try {
    const antwort = await brevo(`/contacts/lists/${BREVO.LIST_ID}`);
    if (!antwort.ok) return null;
    const liste = await antwort.json();
    return liste.uniqueSubscribers ?? liste.totalSubscribers ?? null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const token = String(req.query?.token || '').trim();
  if (!process.env.STATISTIK_TOKEN || token !== process.env.STATISTIK_TOKEN) {
    return sendeJson(res, 401, { ok: false, error: 'Falscher oder fehlender Schlüssel.' });
  }

  try {
    const heute = heuteAthen();

    // 1. Bisherige Tagessummen laden.
    const tageIndex = await list({ prefix: 'tage.json', limit: 1 });
    const tage = tageIndex.blobs.length ? await blobLesen(tageIndex.blobs[0].url) : {};

    // 2. Einzel-Ereignisse lesen und nach Tag gruppieren.
    const ereignisBlobs = await alleAuflisten('e/');
    const gelesen = await gebuendeltLesen(ereignisBlobs);

    const naechste = {};
    for (const { pathname, daten } of gelesen) {
      const tag = pathname.split('/')[1]; // e/2026-09-01/…
      if (!tag) continue;
      naechste[tag] = naechste[tag] || leererTag();
      einrechnen(naechste[tag], daten);
    }

    // 3. Abgeschlossene Tage (alles vor heute) fest in tage.json übernehmen
    //    und die Einzel-Dateien danach löschen.
    const abgeschlossen = Object.keys(naechste).filter((t) => t < heute);
    if (abgeschlossen.length) {
      for (const t of abgeschlossen) {
        tage[t] = verschmelzen(tage[t] || leererTag(), naechste[t]);
      }
      await put('tage.json', JSON.stringify(tage), {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      });
      const zuLoeschen = ereignisBlobs
        .filter((b) => abgeschlossen.includes(b.pathname.split('/')[1]))
        .map((b) => b.url);
      for (let i = 0; i < zuLoeschen.length; i += 100) {
        await del(zuLoeschen.slice(i, i + 100));
      }
    }

    // 4. Antwort: feste Tage + der laufende (noch unverdichtete) Tag.
    const alle = { ...tage };
    if (naechste[heute]) {
      alle[heute] = verschmelzen(strukturKopie(tage[heute]), naechste[heute]);
    }

    res.setHeader('cache-control', 'no-store');
    return sendeJson(res, 200, {
      ok: true,
      stand: new Date().toISOString(),
      heute,
      tage: alle,
      newsletterAbonnenten: await abonnentenZahl(),
    });
  } catch (fehler) {
    console.error('Statistik fehlgeschlagen:', fehler);
    return sendeJson(res, 500, { ok: false, error: 'Auswertung fehlgeschlagen.' });
  }
}

/** Tiefe Kopie einer Tagessumme (oder ein leerer Tag). */
function strukturKopie(tag) {
  return tag ? JSON.parse(JSON.stringify(tag)) : leererTag();
}
