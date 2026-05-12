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

const scheduleIcons = {
  date: `<svg class="artist-card__icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V10h14v10Zm0-12H5V6h14v2Z"/></svg>`,
  time: `<svg class="artist-card__icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm1 11h4v-2h-3V7h-2v6Z"/></svg>`,
  stage: `<svg class="artist-card__icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5Z"/></svg>`,
};

const DAY_ISO_DATES = {
  onsdag: "2026-06-10",
  torsdag: "2026-06-11",
  fredag: "2026-06-12",
  lordag: "2026-06-13",
};

function pickTeaserParagraph(paragraphs) {
  if (!paragraphs?.length) return "";
  const descriptive = paragraphs.find((text, index) => index > 0 && String(text).trim().length > 0);
  return (descriptive || paragraphs[0] || "").trim();
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
      <p><a class="artist-back" href="program.html">← Tilbake til programoversikt</a></p>
    </div>
  `;
}

function renderShowSection(dateLabel, timeLabel, stageLabel, dayKey) {
  const rows = [];
  if (dateLabel) rows.push({ icon: scheduleIcons.date, label: "Dato", value: dateLabel, tag: null });
  if (timeLabel) rows.push({ icon: scheduleIcons.time, label: "Tid", value: timeLabel, tag: "time" });
  if (stageLabel) rows.push({ icon: scheduleIcons.stage, label: "Scene", value: stageLabel, tag: null });
  if (!rows.length) return "";

  const isoDate = dayKey ? DAY_ISO_DATES[dayKey] : null;

  const rowsHtml = rows
    .map((row) => {
      let valueHtml;
      if (row.tag === "time" && isoDate) {
        valueHtml = `<time datetime="${isoDate}T${escapeHtml(row.value)}">${escapeHtml(row.value)}</time>`;
      } else if (row.tag) {
        valueHtml = `<${row.tag}>${escapeHtml(row.value)}</${row.tag}>`;
      } else {
        valueHtml = escapeHtml(row.value);
      }
      return `
            <div class="artist-card__show-item">
              <dt class="artist-card__show-term">
                <span class="artist-card__show-label">${row.icon}<span>${row.label}</span></span>
              </dt>
              <dd class="artist-card__show-value">${valueHtml}</dd>
            </div>`;
    })
    .join("");

  return `
          <section class="artist-card__show" aria-labelledby="artist-show-heading">
            <h2 id="artist-show-heading" class="artist-card__section-title">Konsertinfo</h2>
            <dl class="artist-card__show-list">
              ${rowsHtml}
            </dl>
          </section>`;
}

function isScheduleAnnouncement(text, dateLabel) {
  const normalized = String(text).trim().toLowerCase();
  if (!normalized) return true;

  const hasFestival = normalized.includes("bergenfest");
  const hasWhen =
    (dateLabel && normalized.includes(dateLabel.toLowerCase())) ||
    /\b(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|lordag|søndag)\b/.test(normalized) ||
    /\d{1,2}\.\s*(juni|juli)/.test(normalized);
  const hasPlayVerb = /\b(spiller|headliner|tilbake)\b/.test(normalized);

  return hasFestival && hasWhen && (hasPlayVerb || normalized.length < 140);
}

function getBioParagraphs(paragraphs, teaser, dateLabel) {
  const teaserNorm = teaser.trim().toLowerCase();

  return paragraphs.filter((text) => {
    const normalized = String(text).trim().toLowerCase();
    if (!normalized) return false;
    if (teaserNorm && normalized === teaserNorm) return false;
    if (isScheduleAnnouncement(text, dateLabel)) return false;
    return true;
  });
}

function renderBioHtml(paragraphs, teaser, dateLabel) {
  const bioParagraphs = getBioParagraphs(paragraphs, teaser, dateLabel);
  if (!bioParagraphs.length) return "";

  const first = `<p class="artist-bio__lead">${escapeHtml(bioParagraphs[0])}</p>`;
  if (bioParagraphs.length === 1) return first;

  const rest = bioParagraphs
    .slice(1)
    .map((text) => `<p>${escapeHtml(text)}</p>`)
    .join("");

  return `${first}
            <details class="artist-bio__more">
              <summary class="artist-bio__toggle">Les mer om artisten</summary>
              ${rest}
            </details>`;
}

function renderArtist(artist, schedule) {
  if (!root) return;

  const paras = artist.paragraphs || [];
  const dateLabel = schedule?.dateLabel || artist.dateLabel || "";
  const teaser = pickTeaserParagraph(paras);
  const teaserHtml = teaser
    ? `<p class="artist-card__teaser">${escapeHtml(teaser)}</p>`
    : "";
  const bioHtml = renderBioHtml(paras, teaser, dateLabel);

  const social = dedupeSocial(artist.social || []);
  const socialHtml =
    social.length > 0
      ? `
    <section class="artist-social" aria-labelledby="artist-social-heading">
      <h2 id="artist-social-heading" class="artist-card__section-title">Følg artisten</h2>
      <ul>
        ${social
          .map((s) => {
            const labelText = String(s.label || "").trim();
            const labelHtml = escapeHtml(labelText);
            return `<li><span class="artist-social__channel">${labelHtml}</span></li>`;
          })
          .join("")}
      </ul>
      <p class="artist-social__note">Eksterne kanaler er ikke koblet i prototypen.</p>
    </section>`
      : "";

  const timeLabel = schedule?.time || "";
  const stageLabel = schedule?.stage || "";
  const scheduleHtml = renderShowSection(dateLabel, timeLabel, stageLabel, schedule?.day);

  const imgSrc = escapeAttr(artist.image || artist.listImage || "");
  const alt = escapeAttr(`Pressebilde av ${artist.name}`);

  root.innerHTML = `
    <article class="artist-card">
      <div class="artist-card__inner artist-layout">
        <figure class="artist-card__figure">
          <img src="${imgSrc}" width="800" height="533" alt="${alt}" loading="lazy" decoding="async">
        </figure>
        <div class="artist-card__content">
          <h1 class="artist-card__title">${escapeHtml(artist.name)}</h1>
          ${teaserHtml}
          ${scheduleHtml}
          ${bioHtml ? `<section class="artist-bio" aria-label="Bakgrunn">${bioHtml}</section>` : ""}
          ${socialHtml}
          <nav class="artist-actions" aria-label="Videre navigasjon">
            <a class="button button--primary" href="program.html">Se hele programmet</a>
            <a class="button button--secondary" href="index.html#praktisk">Festivalinfo</a>
          </nav>
        </div>
      </div>
    </article>
    <p class="artist-source">
      Tekst og bilde er hentet fra Bergenfest sin offisielle artistside. Innholdet vises her uten eksterne lenker i prototypen.
    </p>
  `;

  document.title = `${artist.name} – Bergenfest 2026`;
  if (metaDesc) {
    const snippet = teaser ? `${teaser.slice(0, 140).trim()}…` : "Les mer om artisten på Bergenfest.";
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
    const [artistRes, scheduleRes] = await Promise.all([
      fetch("data/artists.json", { credentials: "same-origin" }),
      fetch("data/program-schedule.json", { credentials: "same-origin" }),
    ]);
    if (!artistRes.ok) throw new Error("Kunne ikke laste artistdata.");
    const all = await artistRes.json();
    const artist = all.find((a) => a.slug === slug);
    if (!artist) {
      renderError("Fant ikke denne artisten.");
      document.title = "Artist ikke funnet – Bergenfest 2026";
      return;
    }
    const schedule = scheduleRes.ok ? (await scheduleRes.json())[slug] : null;
    renderArtist(artist, schedule);
  } catch {
    renderError("Noe gikk galt ved lasting av artistdata. Prøv igjen senere.");
    document.title = "Feil – Bergenfest 2026";
  }
}

init();
