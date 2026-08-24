// Newsletter-Anmeldung, Schritt 1 von 2.
//
// Legt die Adresse in Brevo an – aber NICHT in der Verteilerliste – und schickt
// eine Bestätigungsmail mit einem einmaligen Link. Erst der Klick auf diesen
// Link (siehe newsletter-bestaetigen.mjs) trägt die Adresse in die Liste ein.
// Das ist das gesetzlich vorgeschriebene Double-Opt-in.
//
// Nötige Umgebungsvariable bei Netlify: BREVO_API_KEY

import { BREVO, brevo, heute, jsonOderWeiterleitung } from './_brevo.mjs';

export const config = { path: '/api/newsletter' };

export default async (req) => {
  // Vorübergehende Diagnose: verrät nur, OB der Schlüssel in der Funktion
  // ankommt – niemals seinen Wert. Wird nach der Fehlersuche wieder entfernt.
  if (req.method === 'GET') {
    const url = new URL(req.url);
    if (url.searchParams.get('pruefen') !== 'kraut-2608') {
      return new Response('Nur POST', { status: 405 });
    }
    const k = process.env.BREVO_API_KEY;
    return Response.json({
      schluessel_vorhanden: Boolean(k),
      laenge: k ? k.length : 0,
      laenge_ohne_rand: k ? k.trim().length : 0,
      variablennamen_mit_brevo: Object.keys(process.env).filter((n) => /brevo/i.test(n)),
    });
  }

  if (req.method !== 'POST') return new Response('Nur POST', { status: 405 });

  const antwort = jsonOderWeiterleitung(req);

  let data = {};
  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await req.json();
    } else {
      const form = await req.formData();
      for (const [key, value] of form) data[key] = value;
    }
  } catch {
    return antwort.fehler('Die Anfrage konnte nicht gelesen werden.', 400);
  }

  const email = String(data.email || '').trim().toLowerCase();

  // Bots füllen das versteckte Feld aus – wir tun so, als hätte es geklappt.
  if (String(data['bot-field'] || '').trim()) return antwort.ok();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
    return antwort.fehler('Bitte gib eine gültige E-Mail-Adresse an.', 400);
  }

  if (!process.env.BREVO_API_KEY) {
    console.error('BREVO_API_KEY fehlt in den Netlify-Umgebungsvariablen.');
    return antwort.fehler('Der Zugang zum Newsletter-Dienst ist nicht eingerichtet.', 500);
  }

  try {
    // Schon bestätigt? Dann nicht noch einmal anschreiben.
    const vorhanden = await brevo(`/contacts/${encodeURIComponent(email)}`);
    if (vorhanden.ok) {
      const kontakt = await vorhanden.json();
      if (kontakt?.attributes?.NL_STATUS === 'bestaetigt') return antwort.ok();
    }

    const token = neuerToken();

    const angelegt = await brevo('/contacts', {
      method: 'POST',
      body: {
        email,
        updateEnabled: true,
        attributes: { NL_TOKEN: token, NL_STATUS: 'offen', NL_ANGEFRAGT: heute() },
      },
    });
    if (!angelegt.ok && angelegt.status !== 204) {
      console.error('Kontakt anlegen fehlgeschlagen', angelegt.status, await angelegt.text());
      return antwort.fehler('Das hat leider nicht geklappt. Bitte versuch es später noch einmal.', 502);
    }

    const url = new URL(`${BREVO.SITE}/api/newsletter-bestaetigen`);
    url.searchParams.set('e', email);
    url.searchParams.set('t', token);

    const gesendet = await brevo('/smtp/email', {
      method: 'POST',
      body: {
        to: [{ email }],
        templateId: BREVO.TEMPLATE_ID,
        params: { bestaetigungsUrl: url.toString() },
      },
    });
    if (!gesendet.ok) {
      console.error('Bestätigungsmail fehlgeschlagen', gesendet.status, await gesendet.text());
      return antwort.fehler('Die Bestätigungsmail konnte nicht verschickt werden. Bitte versuch es später noch einmal.', 502);
    }

    return antwort.ok();
  } catch (err) {
    console.error('Unerwarteter Fehler bei der Anmeldung:', err);
    return antwort.fehler('Der Newsletter-Dienst antwortet gerade nicht.', 502);
  }
};

function neuerToken() {
  return [...crypto.getRandomValues(new Uint8Array(24))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
