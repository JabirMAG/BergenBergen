import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const STAGES = ["Plenen", "Bastionen", "Magic Mirrors", "Hjertebank-scenen", "Håkonshallen"];
const DAY_ISO_DATES = {
  onsdag: "2026-06-10",
  torsdag: "2026-06-11",
  fredag: "2026-06-12",
  lordag: "2026-06-13",
};
const EARLIEST_MINUTES = 16 * 60;
const LATEST_MINUTES = 22 * 60 + 30;
const SLOT_STEP_MINUTES = 15;

function buildRoundSlots() {
  const slots = [];
  for (let minutes = EARLIEST_MINUTES; minutes <= LATEST_MINUTES; minutes += SLOT_STEP_MINUTES) {
    slots.push(minutes);
  }
  return slots;
}

function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function pickEvenSlots(count) {
  const allSlots = buildRoundSlots();
  const maxIdx = allSlots.length - 1;
  if (count === 0) return [];
  if (count === 1) return [allSlots[maxIdx]];

  const used = new Set();
  const selected = [];

  for (let i = 0; i < count; i++) {
    let slotIdx = Math.round((i / (count - 1)) * maxIdx);
    while (used.has(slotIdx) && slotIdx > 0) slotIdx -= 1;
    while (used.has(slotIdx) && slotIdx < maxIdx) slotIdx += 1;
    used.add(slotIdx);
    selected.push(allSlots[maxIdx - slotIdx]);
  }

  return selected.sort((a, b) => b - a);
}

function scheduleForDay(artists) {
  const selectedMinutes = pickEvenSlots(artists.length);

  return artists.map((artist, index) => {
    const minutes = selectedMinutes[index];
    const stage = index === 0 ? STAGES[0] : STAGES[1 + ((index - 1) % (STAGES.length - 1))];
    return {
      ...artist,
      time: formatMinutes(minutes),
      stage,
    };
  });
}
function renderProgramItem(artist, dayKey) {
  const href = `artist.html?slug=${encodeURIComponent(artist.slug)}`;
  const name = escapeHtml(artist.name);
  const time = escapeHtml(artist.time);
  const stage = escapeHtml(artist.stage);
  const searchName = escapeHtml(artist.name.toLowerCase());
  const isoDate = DAY_ISO_DATES[dayKey] ?? "2026-06-10";

  return `            <li class="program-day__item" data-artist-name="${searchName}" role="row">
              <a class="program-day__link" href="${href}">
                <span class="program-day__name" role="cell">${name}</span>
                <span class="program-day__time" role="cell">
                  <span class="program-day__label">Tid</span>
                  <time datetime="${isoDate}T${time}">${time}</time>
                </span>
                <span class="program-day__stage" role="cell">
                  <span class="program-day__label">Scene</span>
                  ${stage}
                </span>
              </a>
            </li>`;
}

function patchProgramSchedule(merged) {
  const sizes = [11, 13, 17, 20];
  const keys = ["onsdag", "torsdag", "fredag", "lordag"];
  let offset = 0;
  const lines = [];
  const scheduleBySlug = {};

  for (let d = 0; d < 4; d++) {
    const slice = merged.slice(offset, offset + sizes[d]);
    offset += sizes[d];
    const scheduled = scheduleForDay(slice);
    const heading = slice[0].dateLabel.charAt(0).toUpperCase() + slice[0].dateLabel.slice(1);
    const k = keys[d];
    const h2id = `program-dag-${k}`;

    for (const artist of scheduled) {
      scheduleBySlug[artist.slug] = {
        time: artist.time,
        stage: artist.stage,
        dateLabel: artist.dateLabel,
        day: k,
      };
    }

    lines.push(
      `        <section class="program-day program-day--${k}" data-day="${k}" aria-labelledby="${h2id}">`
    );
    lines.push(`          <h2 id="${h2id}" class="program-day__title">${escapeHtml(heading)}</h2>`);
    lines.push(`          <div class="program-day__table" role="table" aria-label="${escapeHtml(heading)}">`);
    lines.push(`            <div class="program-day__header" role="row">`);
    lines.push(`              <span class="program-day__header-cell program-day__header-cell--artist" role="columnheader">Artist</span>`);
    lines.push(`              <span class="program-day__header-cell program-day__header-cell--time" role="columnheader">Tid</span>`);
    lines.push(`              <span class="program-day__header-cell program-day__header-cell--stage" role="columnheader">Scene</span>`);
    lines.push(`            </div>`);
    lines.push(`            <ul class="program-day__list" role="rowgroup">`);

    for (const artist of scheduled) {
      lines.push(renderProgramItem(artist, k));
    }

    lines.push(`            </ul>`);
    lines.push(`          </div>`);
    lines.push(`        </section>`);
  }

  const schedule = lines.join("\n");
  const programPath = path.join(ROOT, "program.html");
  let html = fs.readFileSync(programPath, "utf8");
  const marker = '<div id="program-innhold" class="program-schedule"';
  const start = html.indexOf(marker);
  if (start === -1) throw new Error("program-innhold ikke funnet");
  const openEnd = html.indexOf(">", start) + 1;
  const mainClose = html.lastIndexOf("</main>");
  const block = html.slice(openEnd, mainClose);
  const lastSec = block.lastIndexOf("</section>");
  if (lastSec === -1) throw new Error("fant ingen </section>");
  const innerEnd = openEnd + lastSec + "</section>".length;
  html = html.slice(0, openEnd) + "\n" + schedule + html.slice(innerEnd);
  fs.writeFileSync(programPath, html, "utf8");

  const schedulePath = path.join(ROOT, "data", "program-schedule.json");
  fs.writeFileSync(schedulePath, JSON.stringify(scheduleBySlug, null, 2), "utf8");
  console.log("program.html og data/program-schedule.json oppdatert.");
}

const merged = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "artists.json"), "utf8"));
patchProgramSchedule(merged);
