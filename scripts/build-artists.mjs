/**
 * Henter artistlister fra bergenfest.no/artister?sort=date og hver artistside,
 * og skriver data/artists.json (én post per slug, ingen duplikater).
 * Kjør: node scripts/build-artists.mjs
 */
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data", "artists.json");

const UA = { "User-Agent": "Mozilla/5.0 (compatible; IS217-Bergenfest-course/1.0)" };

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: UA }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location;
          if (loc) {
            const next = new URL(loc, url).href;
            res.resume();
            return resolve(fetchText(next));
          }
        }
        let buf = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (buf += c));
        res.on("end", () => resolve(buf));
      })
      .on("error", reject);
  });
}

function stripTags(html) {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function parseListingRobust(html) {
  const artists = [];
  const linkRe = /<a class="stretched-link" href="\/artister\/([^"/]+)\/?"><\/a>/g;
  let m;
  while ((m = linkRe.exec(html))) {
    const slug = m[1];
    const start = Math.max(0, m.index - 5000);
    const before = html.slice(start, m.index);
    const dates = [...before.matchAll(/<span class="red">([^<]+)<\/span>/g)];
    const dateLabel = dates.length ? dates[dates.length - 1][1].trim() : "";
    const caps = [...before.matchAll(/<div class="caption">([^<]+)<\/div>/g)];
    const imgs = [...before.matchAll(/<img[^>]+src="(https:\/\/st-[^"]+)"/g)];
    if (!caps.length) continue;
    const name = caps[caps.length - 1][1].trim();
    const listImage = imgs.length ? imgs[imgs.length - 1][1] : "";
    artists.push({
      slug,
      name,
      dateLabel,
      listImage
    });
  }
  const seen = new Set();
  return artists.filter((a) => {
    if (seen.has(a.slug)) return false;
    seen.add(a.slug);
    return true;
  });
}

function extractDetail(html, slug) {
  const imgM = html.match(/<div class="artist-image">[\s\S]*?<img[^>]+src="(https:\/\/st-[^"]+)"/);
  const heroImage = imgM ? imgM[1] : "";

  const dateM = html.match(/<div class="artist-meta">\s*<span>[\s\S]*?([^<]+?)\s*<\/span>/);
  const dateLabel = dateM ? dateM[1].trim() : "";

  const nameM = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const name = nameM ? nameM[1].trim() : slug;

  const contentM = html.match(
    /<div class="entry-content container">([\s\S]*?)<div class="col-lg-4 offset-lg-1">/
  );
  let paragraphs = [];
  if (contentM) {
    let block = contentM[1];
    block = block.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
    block = block.replace(/<div data-oembed-url[\s\S]*?<\/div>\s*(<\/div>)?/gi, "");
    const h3m = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
    if (h3m) {
      const lead = stripTags(h3m[1]);
      if (lead.length > 15) paragraphs.push(lead);
    }
    const pRe = /<p>([\s\S]*?)<\/p>/g;
    let pm;
    while ((pm = pRe.exec(block))) {
      const t = stripTags(pm[1]);
      if (t.length > 40 && !t.includes("KJØP BILLETTER")) paragraphs.push(t);
    }
  }

  paragraphs = [...new Set(paragraphs)];

  const social = [];
  const socialBlock = html.match(/<div class="social-media">([\s\S]*?)<\/ul>\s*<\/div>/);
  if (socialBlock) {
    const linkRe = /<a href="(https?:[^"]+)"[^>]*>[\s\S]*?<span>([^<]*)<\/span>/g;
    let sm;
    while ((sm = linkRe.exec(socialBlock[1]))) {
      social.push({ url: sm[1], label: sm[2].trim() || "Lenke" });
    }
  }

  return {
    name,
    dateLabel,
    heroImage,
    paragraphs,
    social,
    sourceUrl: `https://www.bergenfest.no/artister/${slug}/`
  };
}

async function main() {
  console.log("Henter artister-liste …");
  const listing = await fetchText("https://www.bergenfest.no/artister?sort=date");
  const listed = parseListingRobust(listing);
  console.log(`Fant ${listed.length} artister i listen.`);

  const merged = [];
  for (let i = 0; i < listed.length; i++) {
    const a = listed[i];
    const url = `https://www.bergenfest.no/artister/${a.slug}/`;
    process.stdout.write(`\rHenter ${i + 1}/${listed.length}: ${a.slug}   `);
    try {
      const page = await fetchText(url);
      const d = extractDetail(page, a.slug);
      merged.push({
        slug: a.slug,
        name: d.name || a.name,
        dateLabel: d.dateLabel || a.dateLabel,
        image: d.heroImage || a.listImage,
        listImage: a.listImage,
        paragraphs: d.paragraphs,
        social: d.social,
        sourceUrl: d.sourceUrl
      });
      await new Promise((r) => setTimeout(r, 120));
    } catch (e) {
      console.error(`\nFeil ${a.slug}:`, e.message);
      merged.push({
        slug: a.slug,
        name: a.name,
        dateLabel: a.dateLabel,
        image: a.listImage,
        listImage: a.listImage,
        paragraphs: [],
        social: [],
        sourceUrl: url
      });
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(merged, null, 2), "utf8");
  console.log(`\nSkrev ${merged.length} poster til ${OUT}`);

  patchProgramSchedule(merged);
}

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
  if (start === -1) throw new Error("program-innhold ikke funnet i program.html");
  const openEnd = html.indexOf(">", start) + 1;
  const mainClose = html.lastIndexOf("</main>");
  const block = html.slice(openEnd, mainClose);
  const lastSec = block.lastIndexOf("</section>");
  if (lastSec === -1) throw new Error("fant ingen </section> i program.html");
  const innerEnd = openEnd + lastSec + "</section>".length;
  html = `${html.slice(0, openEnd)}\n${schedule}${html.slice(innerEnd)}`;
  fs.writeFileSync(programPath, html, "utf8");
  console.log("Oppdatert program.html med lenker til artistsider.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
