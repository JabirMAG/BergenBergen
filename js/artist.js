/**
 * Artistside: henter innhold fra data/artists.json (generert fra bergenfest.no).
 */
const root = document.getElementById("artist-root");
const metaDesc = document.getElementById("side-meta");

function labelForSocialUrl(url) {
  const u = url.toLowerCase();
  if (u.includes("spotify.com")) return "Spotify";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "YouTube";
  if (u.includes("instagram.com")) return "Instagram";
  if (u.includes("facebook.com")) return "Facebook";
  if (u.includes("tiktok.com")) return "TikTok";
  if (u.includes("twitter.com") || u.includes("x.com")) return "X / Twitter";
  return "Nettside";
}

function dedupeSocial(entries) {
  const seen = new Set();
  const out = [];
  for (const s of entries) {
    if (!s?.url || seen.has(s.url)) continue;
    seen.add(s.url);
    const labelRaw = (s.label || "").trim();
    const fixed =
      labelRaw.toLowerCase() === "youtube" && s.url.includes("spotify")
        ? "Spotify"
        : labelRaw || labelForSocialUrl(s.url);
    out.push({ url: s.url, label: fixed.charAt(0).toUpperCase() + fixed.slice(1) });
  }
  return out;
}

function renderError(message) {
  if (!root) return;
  root.innerHTML = `
    <div class="artist-error" role="alert">
      <p class="artist-error__title">${message}</p>
      <p><a href="program.html">Gå tilbake til programmet</a></p>
    </div>
  `;
}

function renderArtist(artist) {
  if (!root) return;

  const paras = artist.paragraphs || [];
  const bioHtml = paras
    .map((text, i) => {
      const cls = i === 0 ? ' class="artist-bio__lead"' : "";
      return `<p${cls}>${escapeHtml(text)}</p>`;
    })
    .join("");

  const social = dedupeSocial(artist.social || []);
  const socialHtml =
    social.length > 0
      ? `
    <div class="artist-social">
      <p class="artist-social__title">Følg artisten</p>
      <ul>
        ${social
          .map((s) => {
            const labelText = String(s.label || "").trim();
            const labelHtml = escapeHtml(labelText);
            const ariaFull = `${labelText} (åpner i ny fane)`;
            return `<li><a href="${escapeAttr(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeAttr(ariaFull)}">${labelHtml}</a></li>`;
          })
          .join("")}
      </ul>
    </div>`
      : "";

  const imgSrc = escapeAttr(artist.image || artist.listImage || "");
  const alt = escapeAttr(artist.name);

  root.innerHTML = `
    <article class="artist-card">
      <div class="artist-card__inner artist-layout">
        <figure class="artist-card__figure">
          <img src="${imgSrc}" width="800" height="533" alt="${alt}" loading="lazy">
        </figure>
        <div>
          <h1 class="artist-card__title">${escapeHtml(artist.name)}</h1>
          <p class="artist-card__date">${escapeHtml(artist.dateLabel || "")}</p>
          <div class="artist-bio">${bioHtml || "<p>Ingen beskrivelse tilgjengelig.</p>"}</div>
          ${socialHtml}
        </div>
      </div>
    </article>
    <p class="artist-source">
      Tekst, bilde og lenker er hentet fra
      <a href="${escapeAttr(artist.sourceUrl)}">Bergenfest sin artistside</a>
      (kilde oppdatert via lokalt byggeskript).
    </p>
  `;

  document.title = `${artist.name} – Bergenfest 2026`;
  if (metaDesc) {
    const snippet = paras[0] ? `${paras[0].slice(0, 140).trim()}…` : "Les mer om artisten på Bergenfest.";
    metaDesc.setAttribute("content", `${artist.name} på Bergenfest 2026. ${snippet}`);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, "&#39;");
}

async function init() {
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug")?.trim();
  if (!slug) {
    renderError("Mangler artist i adressen (slug).");
    document.title = "Artist – Bergenfest 2026";
    return;
  }

  try {
    const res = await fetch("data/artists.json", { credentials: "same-origin" });
    if (!res.ok) throw new Error("Kunne ikke laste artistdata.");
    const all = await res.json();
    const artist = all.find((a) => a.slug === slug);
    if (!artist) {
      renderError("Fant ikke denne artisten.");
      document.title = "Artist ikke funnet – Bergenfest 2026";
      return;
    }
    renderArtist(artist);
  } catch {
    renderError("Noe gikk galt ved lasting av artistdata. Prøv igjen senere.");
    document.title = "Feil – Bergenfest 2026";
  }
}

init();
