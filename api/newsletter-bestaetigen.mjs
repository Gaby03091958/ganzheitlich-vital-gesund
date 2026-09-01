// Newsletter-Anmeldung, Schritt 2 von 2.
//
// Wird über den Link in der Bestätigungsmail aufgerufen. Stimmt der Token,
// wandert die Adresse in die Verteilerliste und der Zeitpunkt der Bestätigung
// wird als Nachweis gespeichert.

import { BREVO, brevo, heute, leiteWeiter, QUELLEN } from './_brevo.mjs';

export default async function handler(req, res) {
  const email = String(req.query?.e || '').trim().toLowerCase();
  const token = String(req.query?.t || '').trim();

  if (!email || !token) return leiteWeiter(res, '/newsletter-link-ungueltig/');

  if (!process.env.BREVO_API_KEY) {
    console.error('BREVO_API_KEY fehlt in den Vercel-Umgebungsvariablen.');
    return leiteWeiter(res, '/newsletter-link-ungueltig/');
  }

  try {
    const antwort = await brevo(`/contacts/${encodeURIComponent(email)}`);
    if (!antwort.ok) return leiteWeiter(res, '/newsletter-link-ungueltig/');

    const kontakt = await antwort.json();
    const attribute = kontakt.attributes || {};

    // Schon bestätigt: Der Token ist dann gelöscht. Trotzdem freundlich bleiben,
    // falls jemand den Link ein zweites Mal anklickt.
    if (attribute.NL_STATUS === 'bestaetigt') return leiteWeiter(res, '/newsletter-bestaetigt/');

    if (!attribute.NL_TOKEN || attribute.NL_TOKEN !== token) {
      return leiteWeiter(res, '/newsletter-link-ungueltig/');
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
      return leiteWeiter(res, '/newsletter-link-ungueltig/');
    }

    // Wer über die Freebie-Seite gekommen ist, bekommt den 10-Minuten-Check
    // jetzt per Mail – zusätzlich zum Download-Knopf auf der Bestätigungsseite.
    // Schlägt das fehl, ist die Anmeldung trotzdem gültig: Der Fehler wird nur
    // protokolliert, die Besucherin landet normal auf der Bestätigungsseite.
    if (attribute.QUELLE === QUELLEN.FREEBIE_HUND) {
      try {
        const vorname = String(attribute.VORNAME || '').trim();
        const freebie = await brevo('/smtp/email', {
          method: 'POST',
          body: {
            to: [{ email, ...(vorname ? { name: vorname } : {}) }],
            templateId: BREVO.FREEBIE_TEMPLATE_ID,
            params: { vorname, anrede: vorname ? `Hallo ${vorname}` : 'Hallo' },
          },
        });
        if (!freebie.ok) {
          console.error('Freebie-Mail fehlgeschlagen', freebie.status, await freebie.text());
        }
      } catch (fehler) {
        console.error('Freebie-Mail fehlgeschlagen:', fehler);
      }
    }

    return leiteWeiter(res, '/newsletter-bestaetigt/');
  } catch (err) {
    console.error('Unerwarteter Fehler bei der Bestätigung:', err);
    return leiteWeiter(res, '/newsletter-link-ungueltig/');
  }
}
