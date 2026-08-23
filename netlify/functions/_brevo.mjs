// Gemeinsame Helfer für die beiden Newsletter-Funktionen.

export const BREVO = {
  API: 'https://api.brevo.com/v3',
  SITE: 'https://ganzheitlich-vital-gesund.de',
  LIST_ID: 3, // "Newsletter – Ganzheitlich vital & gesund"
  TEMPLATE_ID: 1, // "Newsletter Bestätigung"
};

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
 * Mit JavaScript erwartet das Formular JSON, ohne JavaScript schickt der
 * Browser es normal ab – dann leiten wir auf die passende Seite weiter.
 */
export function jsonOderWeiterleitung(req) {
  const willJson = (req.headers.get('accept') || '').includes('application/json');
  return {
    ok: () =>
      willJson
        ? Response.json({ ok: true })
        : new Response(null, { status: 303, headers: { location: `${BREVO.SITE}/danke/` } }),
    fehler: (nachricht, status) =>
      willJson
        ? Response.json({ ok: false, error: nachricht }, { status })
        : new Response(nachricht, {
            status,
            headers: { 'content-type': 'text/plain; charset=utf-8' },
          }),
  };
}
