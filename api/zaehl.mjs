// Besucherstatistik, Schritt 1: Zählen.
//
// Nimmt die kleinen Meldungen entgegen, die jede Seite beim Aufruf schickt
// (und beim Klick auf einen Partnerlink), und legt sie als Mini-Datei im
// privaten Blob-Speicher ab. Bewusst ohne Cookies und ohne IP-Adresse –
// gespeichert wird nur: Seite, Herkunft, Land, Zeitpunkt.
//
// Die Auswertung übernimmt api/statistik.mjs.

import { put } from '@vercel/blob';

/** Datum (JJJJ-MM-TT) in Gabys Zeitzone – so enden die Tage nicht um 2 Uhr nachts. */
export function heuteAthen(zeitpunkt = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Athens' }).format(zeitpunkt);
}

// Suchmaschinen und Vorschau-Roboter nicht mitzählen.
const ROBOTER = /bot|crawl|spider|slurp|preview|fetch|monitor|lighthouse|headless|curl|wget|python|scan/i;

/** Nur harmlose, kurze Texte in den Speicher lassen. */
function kurz(wert, max) {
  return String(wert || '').replace(/[\x00-\x1f\x7f]/g, '').slice(0, max);
}

/** Aus dem vollen Referrer nur den Hostnamen behalten (mehr brauchen wir nicht). */
function herkunft(referrer) {
  try {
    if (!referrer) return '';
    return new URL(referrer).hostname.replace(/^www\./, '').slice(0, 100);
  } catch {
    return '';
  }
}

export default async function handler(req, res) {
  res.statusCode = 204; // Antwort ist immer "ok, danke" – auch bei Müll.

  if (req.method !== 'POST') return res.end();
  if (ROBOTER.test(String(req.headers['user-agent'] || ''))) return res.end();
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('BLOB_READ_WRITE_TOKEN fehlt – Zählung übersprungen.');
    return res.end();
  }

  try {
    let daten = req.body;
    if (typeof daten === 'string') daten = JSON.parse(daten);
    if (Buffer.isBuffer(daten)) daten = JSON.parse(daten.toString('utf8'));
    if (!daten || typeof daten !== 'object') return res.end();

    const pfad = kurz(daten.p, 200).split('?')[0];
    if (!pfad.startsWith('/')) return res.end();

    const eintrag = daten.k
      ? {
          art: 'klick',
          pfad,
          ziel: kurz(daten.z, 200),
        }
      : {
          art: 'seite',
          pfad,
          quelle: herkunft(daten.r),
          neu: daten.n ? 1 : 0,
          ...(daten.pin ? { pin: kurz(daten.pin, 60).replace(/[^\wäöüß-]/gi, '') } : {}),
        };

    eintrag.t = new Date().toISOString();
    eintrag.land = kurz(req.headers['x-vercel-ip-country'], 2);

    const tag = heuteAthen();
    const name = `e/${tag}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
    await put(name, JSON.stringify(eintrag), {
      access: 'private',
      addRandomSuffix: false,
      contentType: 'application/json',
    });
  } catch (fehler) {
    console.error('Zählung fehlgeschlagen:', fehler);
  }
  return res.end();
}
