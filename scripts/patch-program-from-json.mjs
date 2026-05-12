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

function patchProgramSchedule(merged) {
  const sizes = [11, 13, 17, 20];
  const keys = ["onsdag", "torsdag", "fredag", "lordag"];
  let offset = 0;
  const lines = [];
  for (let d = 0; d < 4; d++) {
    const slice = merged.slice(offset, offset + sizes[d]);
    offset += sizes[d];
    const heading =
      slice[0].dateLabel.charAt(0).toUpperCase() + slice[0].dateLabel.slice(1);
    const k = keys[d];
    const h2id = `program-dag-${k}`;
    lines.push(`        <section class="program-day program-day--${k}" data-day="${k}" aria-labelledby="${h2id}">`);
    lines.push(`          <h2 id="${h2id}" class="program-day__title">${escapeHtml(heading)}</h2>`);
    lines.push(`          <ul class="program-day__list">`);
    for (const a of slice) {
      const href = `artist.html?slug=${encodeURIComponent(a.slug)}`;
      lines.push(
        `            <li class="program-day__item"><a class="program-day__link" href="${href}">${escapeHtml(a.name)}</a></li>`
      );
    }
    lines.push(`          </ul>`);
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
  console.log("program.html oppdatert.");
}

const merged = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "artists.json"), "utf8"));
patchProgramSchedule(merged);
