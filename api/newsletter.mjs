// Newsletter-Anmeldung, Schritt 1 von 2.
//
// Legt die Adresse in Brevo an – aber NICHT in der Verteilerliste – und schickt
// eine Bestätigungsmail mit einem einmaligen Link. Erst der Klick auf diesen
// Link (siehe newsletter-bestaetigen.mjs) trägt die Adresse in die Liste ein.
// Das ist das gesetzlich vorgeschriebene Double-Opt-in.
//
// Nötige Umgebungsvariable bei Vercel: BREVO_API_KEY

import { BREVO, brevo, felder, heute, jsonOderWeiterleitung, seitenAdresse } from './_brevo.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end('Nur POST');
  }

  const antwort = jsonOderWeiterleitung(req, res);
  const data = felder(req);

  const email = String(data.email || '').trim().toLowerCase();
  // Der Vorname ist freiwillig; er dient nur der Anrede in den Mails.
  const vorname = String(data.vorname || '').trim().slice(0, 60);

  // Bots füllen das versteckte Feld aus – wir tun so, als hätte es geklappt.
  if (String(data['bot-field'] || '').trim()) return antwort.ok();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
    return antwort.fehler('Bitte gib eine gültige E-Mail-Adresse an.', 400);
  }

  if (!process.env.BREVO_API_KEY) {
    console.error('BREVO_API_KEY fehlt in den Vercel-Umgebungsvariablen.');
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
        attributes: {
          NL_TOKEN: token,
          NL_STATUS: 'offen',
          NL_ANGEFRAGT: heute(),
          // Nur setzen, wenn wirklich einer eingetragen wurde – sonst würde ein
          // leeres Feld einen früher gespeicherten Vornamen überschreiben.
          ...(vorname ? { VORNAME: vorname } : {}),
        },
      },
    });
    if (!angelegt.ok && angelegt.status !== 204) {
      console.error('Kontakt anlegen fehlgeschlagen', angelegt.status, await angelegt.text());
      return antwort.fehler('Das hat leider nicht geklappt. Bitte versuch es später noch einmal.', 502);
    }

    const url = new URL(`${seitenAdresse()}/api/newsletter-bestaetigen`);
    url.searchParams.set('e', email);
    url.searchParams.set('t', token);

    const gesendet = await brevo('/smtp/email', {
      method: 'POST',
      body: {
        to: [{ email, ...(vorname ? { name: vorname } : {}) }],
        templateId: BREVO.TEMPLATE_ID,
        // "anrede" ist so gebaut, dass die Vorlage sie immer einsetzen kann:
        // mit Vornamen "Hallo Gaby", ohne Vornamen einfach "Hallo".
        params: {
          bestaetigungsUrl: url.toString(),
          vorname,
          anrede: vorname ? `Hallo ${vorname}` : 'Hallo',
        },
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
}

function neuerToken() {
  return [...crypto.getRandomValues(new Uint8Array(24))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
