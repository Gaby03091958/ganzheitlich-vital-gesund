// Datenspeicher im privaten GitHub-Repo (seit 29.09.2026, ersetzt Vercel Blob).
//
// Die Daten liegen als JSON-Dateien im Repo GITHUB_DATEN_REPO (Standard:
// Gaby03091958/gaby-daten) und werden über die GitHub-Contents-API gelesen und
// geschrieben. Jede Änderung ist ein Commit. Gleichzeitige Schreibzugriffe
// fängt die sha-Prüfung ab: Hat jemand anderes die Datei inzwischen geändert,
// lehnt GitHub ab (409) — dann wird neu gelesen, neu geändert, neu geschrieben.
//
// Zugang: fein-granulares Token nur für dieses eine Repo, Umgebungsvariable
// GITHUB_DATEN_TOKEN (Klartext lokal in ~/.claude/secrets/github-daten-token.txt).
//
// Warum weg von Blob: Das Hobby-Kontingent (2.000 Advanced Operations/Monat)
// war nach wenigen Wochen weg, danach 30 Tage Komplettsperre. Plan:
// plans/2026-09-29-weg-von-vercel-blob.md
//
// Gleiche Datei liegt als eigenständige Kopie auch in hub/api/.

const API = 'https://api.github.com';

function repo() {
  return process.env.GITHUB_DATEN_REPO || 'Gaby03091958/gaby-daten';
}

function kopf(accept = 'application/vnd.github+json') {
  if (!process.env.GITHUB_DATEN_TOKEN) throw new Error('GITHUB_DATEN_TOKEN fehlt.');
  return {
    authorization: `Bearer ${process.env.GITHUB_DATEN_TOKEN}`,
    accept,
    'x-github-api-version': '2022-11-28',
    'user-agent': 'gaby-daten',
  };
}

function adresse(pfad) {
  return `${API}/repos/${repo()}/contents/${pfad.split('/').map(encodeURIComponent).join('/')}`;
}

/** Datei lesen. Gibt { daten, sha } zurück; fehlt die Datei: { daten: null, sha: null }. */
export async function githubLesen(pfad) {
  const antwort = await fetch(adresse(pfad), { headers: kopf(), cache: 'no-store' });
  if (antwort.status === 404) return { daten: null, sha: null };
  if (!antwort.ok) throw new Error(`GitHub-Lesen fehlgeschlagen: ${antwort.status}`);
  const info = await antwort.json();

  let text;
  if (info.encoding === 'base64' && info.content) {
    text = Buffer.from(info.content, 'base64').toString('utf8');
  } else {
    // Ab 1 MB liefert GitHub den Inhalt nicht mehr mit — dann roh nachladen.
    const roh = await fetch(adresse(pfad), { headers: kopf('application/vnd.github.raw'), cache: 'no-store' });
    if (!roh.ok) throw new Error(`GitHub-Lesen (roh) fehlgeschlagen: ${roh.status}`);
    text = await roh.text();
  }
  return { daten: text.trim() ? JSON.parse(text) : null, sha: info.sha };
}

/** Datei schreiben. Gibt die neue sha zurück, bei Konflikt null. */
export async function githubSchreiben(pfad, daten, sha, nachricht) {
  const antwort = await fetch(adresse(pfad), {
    method: 'PUT',
    headers: { ...kopf(), 'content-type': 'application/json' },
    body: JSON.stringify({
      message: String(nachricht || 'Daten aktualisiert').slice(0, 200),
      content: Buffer.from(JSON.stringify(daten, null, 1), 'utf8').toString('base64'),
      ...(sha ? { sha } : {}),
    }),
  });
  // 409 = sha passt nicht mehr, 422 = Datei ist inzwischen angelegt worden → beides neu versuchen.
  if (antwort.status === 409 || antwort.status === 422) return null;
  if (!antwort.ok) throw new Error(`GitHub-Schreiben fehlgeschlagen: ${antwort.status}`);
  return (await antwort.json()).content.sha;
}

/**
 * Lesen → ändern → schreiben, bei Konflikt von vorn (bis zu `versuche`-mal).
 * `aendernFn(daten)` bekommt den aktuellen Inhalt (oder null) und gibt den neuen zurück.
 * Wirft sie einen Fehler, wird nichts geschrieben und der Fehler weitergereicht.
 * Rückgabe: der geschriebene Inhalt.
 */
export async function schreibenMitRetry(pfad, aendernFn, nachricht, versuche = 5) {
  for (let i = 0; i < versuche; i++) {
    const { daten, sha } = await githubLesen(pfad);
    const neu = await aendernFn(daten);
    if ((await githubSchreiben(pfad, neu, sha, nachricht)) !== null) return neu;
    await new Promise((r) => setTimeout(r, 150 + Math.random() * 350 * (i + 1)));
  }
  throw new Error(`GitHub-Schreiben: nach ${versuche} Versuchen weiter Konflikt (${pfad}).`);
}
