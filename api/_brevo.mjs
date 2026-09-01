// Gemeinsame Helfer für die beiden Newsletter-Funktionen.
//
// Dateien im api-Ordner, die mit _ beginnen, behandelt Vercel nicht als eigene
// Adresse – sie sind reine Bausteine für die anderen Funktionen.

export const BREVO = {
  API: 'https://api.brevo.com/v3',
  SITE: 'https://ganzheitlich-vital-gesund.de',
  LIST_ID: 3, // "Newsletter – Ganzheitlich vital & gesund"
  TEMPLATE_ID: 1, // "Newsletter Bestätigung" (Double-Opt-in)
  FREEBIE_TEMPLATE_ID: 2, // "Freebie – Der 10-Minuten-Check" (Auslieferung nach der Bestätigung)
};

/**
 * Woher die Anmeldung kam. Wird als Kontaktmerkmal QUELLE bei Brevo gespeichert
 * und entscheidet, ob nach der Bestätigung das Freebie verschickt wird.
 * Bewusst eine feste Liste – so landet nichts Beliebiges aus dem Formular in Brevo.
 */
export const QUELLEN = {
  FREEBIE_HUND: '10-minuten-check',
};

/** Prüft den Wert aus dem Formular gegen die erlaubten Quellen. */
export function quelleAusFormular(wert) {
  const q = String(wert || '').trim();
  return Object.values(QUELLEN).includes(q) ? q : '';
}

/** Ruft die Brevo-API auf und gibt die rohe Response zurück. */
export function brevo(pfad, { method = 'GET', body } = {}) {
  return fetch(`${BREVO.API}${pfad}`, {
    method,
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      accept: 'application/json',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

/** Datum im von Brevo erwarteten Format. */
export function heute() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Adresse der eigenen Seite. In der Produktion die echte Domain; auf einer
 * Vercel-Testadresse (Vorschau-Deploy) die Testadresse selbst – so führt der
 * Bestätigungslink beim Testen auch wirklich zurück auf die getestete Version.
 */
export function seitenAdresse() {
  const umgebung = process.env.VERCEL_ENV;
  if (umgebung && umgebung !== 'production' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return BREVO.SITE;
}

/**
 * Liest die Formularfelder – egal ob sie als JSON oder als normales Formular
 * ankommen. Vercel wandelt beides selbst um; für den Fall, dass doch Rohtext
 * ankommt, wird der hier zusätzlich zerlegt.
 */
export function felder(req) {
  const body = req.body;
  if (!body) return {};
  if (typeof body === 'string') return Object.fromEntries(new URLSearchParams(body));
  if (Buffer.isBuffer(body)) return Object.fromEntries(new URLSearchParams(body.toString('utf8')));
  return body;
}

/** Schickt eine JSON-Antwort. */
export function sendeJson(res, status, daten) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(daten));
}

/** Leitet den Browser auf eine Seite der Website weiter. */
export function leiteWeiter(res, pfad) {
  res.statusCode = 303;
  res.setHeader('location', `${seitenAdresse()}${pfad}`);
  res.end();
}

/**
 * Mit JavaScript erwartet das Formular JSON, ohne JavaScript schickt der
 * Browser es normal ab – dann leiten wir auf die passende Seite weiter.
 */
export function jsonOderWeiterleitung(req, res) {
  const willJson = String(req.headers.accept || '').includes('application/json');
  return {
    ok: () => (willJson ? sendeJson(res, 200, { ok: true }) : leiteWeiter(res, '/danke/')),
    fehler: (nachricht, status) => {
      if (willJson) return sendeJson(res, status, { ok: false, error: nachricht });
      res.statusCode = status;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      res.end(nachricht);
    },
  };
}
