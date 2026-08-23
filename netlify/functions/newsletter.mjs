// Newsletter-Anmeldung: nimmt das Formular der Website entgegen und meldet die
// Adresse bei Brevo mit Double-Opt-in an. Brevo verschickt daraufhin die
// Bestätigungsmail; erst nach dem Klick darauf landet der Kontakt in der Liste.
//
// Nötige Umgebungsvariable bei Netlify: BREVO_API_KEY

const LIST_ID = 3; // "Newsletter – Ganzheitlich vital & gesund"
const DOI_TEMPLATE_ID = 1; // "Newsletter Double-Opt-in"
const SITE = 'https://ganzheitlich-vital-gesund.de';

export const config = { path: '/api/newsletter' };

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Nur POST', { status: 405 });
  }

  const contentType = req.headers.get('content-type') || '';
  let data = {};
  try {
    if (contentType.includes('application/json')) {
      data = await req.json();
    } else {
      const form = await req.formData();
      for (const [key, value] of form) data[key] = value;
    }
  } catch {
    return antwortFehler(req, 'Die Anfrage konnte nicht gelesen werden.', 400);
  }

  const email = String(data.email || '').trim().toLowerCase();
  const honeypot = String(data['bot-field'] || '').trim();

  // Bots füllen das versteckte Feld aus – wir tun so, als hätte es geklappt.
  if (honeypot) return antwortOk(req);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
    return antwortFehler(req, 'Bitte gib eine gültige E-Mail-Adresse an.', 400);
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('BREVO_API_KEY fehlt in den Netlify-Umgebungsvariablen.');
    return antwortFehler(req, 'Die Anmeldung ist gerade nicht erreichbar.', 500);
  }

  let res;
  try {
    res = await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        includeListIds: [LIST_ID],
        templateId: DOI_TEMPLATE_ID,
        redirectionUrl: `${SITE}/newsletter-bestaetigt/`,
      }),
    });
  } catch (err) {
    console.error('Brevo nicht erreichbar:', err);
    return antwortFehler(req, 'Die Anmeldung ist gerade nicht erreichbar.', 502);
  }

  if (res.status === 201 || res.status === 204) return antwortOk(req);

  const text = await res.text();

  // Adresse ist schon angemeldet – für die Besucherin kein Fehler.
  if (res.status === 400 && /duplicate|already/i.test(text)) return antwortOk(req);

  console.error('Brevo-Fehler', res.status, text);
  return antwortFehler(req, 'Das hat leider nicht geklappt. Bitte versuch es später noch einmal.', 502);
};

// Ohne JavaScript schickt der Browser das Formular normal ab – dann leiten wir
// auf die Danke-Seite weiter. Mit JavaScript kommt JSON zurück.
function willJson(req) {
  return (req.headers.get('accept') || '').includes('application/json');
}

function antwortOk(req) {
  if (willJson(req)) return Response.json({ ok: true });
  return new Response(null, { status: 303, headers: { location: `${SITE}/danke/` } });
}

function antwortFehler(req, nachricht, status) {
  if (willJson(req)) return Response.json({ ok: false, error: nachricht }, { status });
  return new Response(nachricht, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
