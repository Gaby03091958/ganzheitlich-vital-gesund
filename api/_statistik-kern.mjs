// Besucherstatistik: gemeinsame Zähl-Logik für api/zaehl.mjs und api/statistik.mjs.
//
// Seit 29.09.2026 wird jeder Besuch sofort in die Tagessumme eingerechnet
// (statistik/tage.json im privaten GitHub-Repo gaby-daten, siehe _github.mjs).
// Früher lag jeder Besuch als eigene Mini-Datei im Vercel Blob und wurde erst
// beim Aufruf von /statistik/ verdichtet — das hat das Blob-Kontingent gesprengt.

export const TAGE_PFAD = 'statistik/tage.json';

/** Datum (JJJJ-MM-TT) in Gabys Zeitzone – so enden die Tage nicht um 2 Uhr nachts. */
export function heuteAthen(zeitpunkt = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Athens' }).format(zeitpunkt);
}

export function leererTag() {
  return { aufrufe: 0, besuche: 0, seiten: {}, quellen: {}, laender: {}, klicks: {}, klickSeiten: {}, pins: {} };
}

/** Referrer-Hostname zu einer lesbaren Quellen-Gruppe. */
export function quellenGruppe(host) {
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
export function einrechnen(tag, e) {
  for (const feld of ['seiten', 'quellen', 'laender', 'klicks', 'klickSeiten', 'pins']) {
    if (!tag[feld]) tag[feld] = {};
  }
  if (e.art === 'klick') {
    zaehle(tag.klicks, e.ziel || 'unbekannt');
    zaehle(tag.klickSeiten, e.pfad);
    return tag;
  }
  tag.aufrufe = (tag.aufrufe || 0) + 1;
  zaehle(tag.seiten, e.pfad);
  zaehle(tag.laender, e.land);
  if (e.pin) zaehle(tag.pins, e.pin);
  if (e.neu) {
    tag.besuche = (tag.besuche || 0) + 1;
    zaehle(tag.quellen, quellenGruppe(e.quelle));
  }
  return tag;
}
