// Newsletter-Anmeldung, Schritt 2 von 2.
//
// Wird über den Link in der Bestätigungsmail aufgerufen. Stimmt der Token,
// wandert die Adresse in die Verteilerliste und der Zeitpunkt der Bestätigung
// wird als Nachweis gespeichert.

import { BREVO, brevo, heute } from './_brevo.mjs';

export const config = { path: '/api/newsletter-bestaetigen' };

export default async (req) => {
  const url = new URL(req.url);
  const email = String(url.searchParams.get('e') || '').trim().toLowerCase();
  const token = String(url.searchParams.get('t') || '').trim();

  if (!email || !token) return zurueck('/newsletter-link-ungueltig/');

  if (!process.env.BREVO_API_KEY) {
    console.error('BREVO_API_KEY fehlt in den Netlify-Umgebungsvariablen.');
    return zurueck('/newsletter-link-ungueltig/');
  }

  try {
    const res = await brevo(`/contacts/${encodeURIComponent(email)}`);
    if (!res.ok) return zurueck('/newsletter-link-ungueltig/');

    const kontakt = await res.json();
    const attribute = kontakt.attributes || {};

    // Schon bestätigt: Der Token ist dann gelöscht. Trotzdem freundlich bleiben,
    // falls jemand den Link ein zweites Mal anklickt.
    if (attribute.NL_STATUS === 'bestaetigt') return zurueck('/newsletter-bestaetigt/');

    if (!attribute.NL_TOKEN || attribute.NL_TOKEN !== token) {
      return zurueck('/newsletter-link-ungueltig/');
    }

    const aktualisiert = await brevo(`/contacts/${encodeURIComponent(email)}`, {
      method: 'PUT',
      body: {
        listIds: [BREVO.LIST_ID],
        attributes: {
          NL_STATUS: 'bestaetigt',
          NL_BESTAETIGT: heute(),
          NL_TOKEN: '', // Token verbrauchen
          OPT_IN: true,
        },
      },
    });

    if (!aktualisiert.ok && aktualisiert.status !== 204) {
      console.error('Bestätigung fehlgeschlagen', aktualisiert.status, await aktualisiert.text());
      return zurueck('/newsletter-link-ungueltig/');
    }

    return zurueck('/newsletter-bestaetigt/');
  } catch (err) {
    console.error('Unerwarteter Fehler bei der Bestätigung:', err);
    return zurueck('/newsletter-link-ungueltig/');
  }
};

function zurueck(pfad) {
  return new Response(null, { status: 303, headers: { location: `${BREVO.SITE}${pfad}` } });
}
