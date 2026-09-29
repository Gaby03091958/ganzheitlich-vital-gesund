// Besucherstatistik, Schritt 2: Auswerten.
//
// Liest die Tagessummen (statistik/tage.json im privaten GitHub-Repo
// gaby-daten) und liefert sie als JSON an /statistik/ und ans Cockpit.
// Seit 29.09.2026 rechnet api/zaehl.mjs jeden Besuch sofort ein — das frühere
// Verdichten und Löschen einzelner Blob-Dateien ist entfallen.
//
// Zugang nur mit dem Statistik-Schlüssel (Umgebungsvariable STATISTIK_TOKEN).
// Personenbezogenes wird hier nicht verarbeitet – es gibt schlicht keins.

import { BREVO, brevo, sendeJson } from './_brevo.mjs';
import { githubLesen } from './_github.mjs';
import { TAGE_PFAD, heuteAthen } from './_statistik-kern.mjs';

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
    const { daten: tage } = await githubLesen(TAGE_PFAD);
    const alle = tage || {};

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
