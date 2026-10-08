// Rendert ein Markdown-Dokument als druckfertiges A4-PDF.
//
//   node scripts/md-to-pdf.mjs docs/plan-security-data-warehousing.md
//   node scripts/md-to-pdf.mjs <input.md> [output.pdf] [--title "…"] [--subtitle "…"]
//                              [--no-cover]
//
// Deckblatt und Inhalt werden getrennt gerendert und anschließend zusammengeführt,
// damit das Deckblatt randlos bleibt und keine Kopf-/Fußzeile erhält.
//
// Die Werkzeuge liegen bewusst AUSSERHALB dieses Repos, damit package.json
// unberührt bleibt. Einmalige Einrichtung:
//
//   mkdir -p ~/.cache/lovedis-pdf-tools && cd ~/.cache/lovedis-pdf-tools \
//     && npm install marked puppeteer-core pdf-lib
//
// Als Renderer wird ein vorhandenes Chrome/Chromium aus dem Puppeteer- bzw.
// Playwright-Cache verwendet (kein Download).

import { readFile, writeFile, unlink } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";
import path from "node:path";

const TOOLS_DIR =
  process.env.LOVEDIS_PDF_TOOLS ?? path.join(homedir(), ".cache", "lovedis-pdf-tools");
const requireTools = createRequire(path.join(TOOLS_DIR, "package.json"));

let marked, puppeteer, PDFDocument;
try {
  ({ marked } = requireTools("marked"));
  puppeteer = requireTools("puppeteer-core");
  ({ PDFDocument } = requireTools("pdf-lib"));
} catch {
  console.error(
    `Werkzeuge nicht gefunden in ${TOOLS_DIR}.\n` +
      `Einrichtung:  mkdir -p "${TOOLS_DIR}" && cd "${TOOLS_DIR}" && ` +
      `npm install marked puppeteer-core pdf-lib`
  );
  process.exit(1);
}

// --- Chrome finden -----------------------------------------------------------

function findChrome() {
  const candidates = [];
  const arches = ["chrome-mac-arm64", "chrome-mac-x64"];

  const puppeteerCache = path.join(homedir(), ".cache", "puppeteer");
  for (const flavour of ["chrome", "chrome-headless-shell"]) {
    const base = path.join(puppeteerCache, flavour);
    if (!existsSync(base)) continue;
    for (const version of readdirSync(base)) {
      for (const arch of arches) {
        candidates.push(
          path.join(
            base, version, arch,
            "Google Chrome for Testing.app", "Contents", "MacOS",
            "Google Chrome for Testing"
          )
        );
      }
      for (const arch of ["mac-arm64", "mac-x64"]) {
        candidates.push(
          path.join(base, version, `chrome-headless-shell-${arch}`, "chrome-headless-shell")
        );
      }
    }
  }

  const playwrightCache = path.join(homedir(), "Library", "Caches", "ms-playwright");
  if (existsSync(playwrightCache)) {
    for (const dir of readdirSync(playwrightCache)) {
      candidates.push(
        path.join(playwrightCache, dir, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
        path.join(playwrightCache, dir, "chrome-mac-arm64", "Chromium.app", "Contents", "MacOS", "Chromium")
      );
    }
  }

  candidates.push(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
  );

  return candidates.find((p) => existsSync(p));
}

// --- Argumente ---------------------------------------------------------------

const argv = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i].startsWith("--")) {
    const key = argv[i].slice(2);
    if (argv[i + 1] && !argv[i + 1].startsWith("--")) {
      flags[key] = argv[i + 1];
      i += 1;
    } else {
      flags[key] = true;
    }
  } else {
    positional.push(argv[i]);
  }
}

const inputPath = positional[0];
if (!inputPath) {
  console.error("Aufruf: node scripts/md-to-pdf.mjs <input.md> [output.pdf]");
  process.exit(1);
}
const outputPath = positional[1] ?? inputPath.replace(/\.md$/, ".pdf");

// --- Markdown → HTML ---------------------------------------------------------

/**
 * GitHub-kompatible Anker. Mehrfach-Bindestriche werden kollabiert und dieselbe
 * Normalisierung auf Überschriften UND Link-Ziele angewandt, damit ein manuell
 * gepflegtes Inhaltsverzeichnis im PDF klickbar bleibt.
 */
function slug(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const source = await readFile(inputPath, "utf8");

const renderer = new marked.Renderer();
const headings = [];

renderer.heading = function ({ tokens, depth }) {
  const text = this.parser.parseInline(tokens);
  const id = slug(text);
  headings.push({ depth, text, id });
  return `<h${depth} id="${id}">${text}</h${depth}>\n`;
};

renderer.link = function ({ href, title, tokens }) {
  const text = this.parser.parseInline(tokens);
  const target = href?.startsWith("#") ? `#${slug(href.slice(1))}` : href;
  return `<a href="${target}"${title ? ` title="${title}"` : ""}>${text}</a>`;
};

marked.setOptions({ renderer, gfm: true, breaks: false });
const body = marked.parse(source);

const firstH1 = headings.find((h) => h.depth === 1);
const rawTitle = flags.title ?? firstH1?.text ?? path.basename(inputPath, ".md");
const subtitle =
  flags.subtitle ??
  "Architektur- &amp; Sicherheitskonzept für die Lovedis-Plattform und die Mara-Anwendungsschicht";

const today = new Date().toLocaleDateString("de-DE", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

// Titelzeile fürs Deckblatt: Präfix vor dem Gedankenstrich entfällt.
const coverTitle = rawTitle.includes("—") ? rawTitle.split("—").slice(1).join("—").trim() : rawTitle;
const coverKicker = rawTitle.includes("—") ? rawTitle.split("—")[0].trim() : "Lovedis";

// --- Gemeinsames Stylesheet --------------------------------------------------

const styles = `
  :root {
    --ink: #14171f;
    --muted: #5b6272;
    --line: #d7dbe4;
    --line-soft: #edeff4;
    --accent: #1f4ed8;
    --accent-soft: #eef2fd;
    --code-bg: #f6f8fa;
    --warn-bg: #fff8e6;
  }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: -apple-system, "Helvetica Neue", "Segoe UI", Arial, sans-serif;
    font-size: 9.5pt;
    line-height: 1.55;
    color: var(--ink);
    margin: 0;
    hyphens: auto;
    -webkit-hyphens: auto;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 700;
    line-height: 1.25;
    color: #0d1117;
    break-after: avoid-page;
    page-break-after: avoid;
    margin: 0 0 3mm;
  }
  h1 {
    font-size: 18.5pt;
    margin-top: 0;
    padding-bottom: 3mm;
    border-bottom: 2.5px solid var(--accent);
    letter-spacing: -0.01em;
  }
  h2 {
    font-size: 14pt;
    margin-top: 9mm;
    padding-bottom: 2mm;
    border-bottom: 1px solid var(--line);
    break-before: page;
    page-break-before: always;
  }
  h2.no-break { break-before: auto; page-break-before: auto; margin-top: 3mm; }
  h3 { font-size: 11.4pt; margin-top: 7mm; color: #1a2233; }
  h4 { font-size: 10.1pt; margin-top: 5mm; color: #2b3346; }
  h5, h6 { font-size: 9.5pt; margin-top: 4mm; color: var(--muted); }

  p { margin: 0 0 2.8mm; orphans: 3; widows: 3; }
  a { color: var(--accent); text-decoration: none; }
  strong { font-weight: 700; color: #0b0e14; }

  ul, ol { margin: 0 0 3mm; padding-left: 6.5mm; }
  li { margin-bottom: 1.2mm; }
  li > ul, li > ol { margin-top: 1.2mm; margin-bottom: 1.2mm; }

  .toc-list { columns: 2; column-gap: 10mm; font-size: 9.6pt; padding-left: 5mm; }
  .toc-list li { margin-bottom: 1.7mm; break-inside: avoid; }
  .toc-list a { color: var(--ink); }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 4mm;
    font-size: 8.2pt;
    line-height: 1.4;
  }
  thead { display: table-header-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  th, td {
    border: 1px solid var(--line);
    padding: 1.5mm 2mm;
    text-align: left;
    vertical-align: top;
    /* break-word statt anywhere: Chrome quetscht Spalten sonst unnötig schmal
       und zerlegt kurze Wörter ("Be-darf"). Trennung nur, wenn es nicht passt. */
    overflow-wrap: break-word;
    hyphens: none;
    -webkit-hyphens: none;
  }
  th { background: var(--accent-soft); font-weight: 700; color: #16224a; font-size: 8pt; }
  tbody tr:nth-child(even) { background: #fafbfd; }
  td code, th code { font-size: 7.5pt; }
  table.wide { font-size: 7.5pt; }
  table.wide th, table.wide td { padding: 1.1mm 1.4mm; }

  pre {
    background: var(--code-bg);
    border: 1px solid var(--line);
    border-left: 3px solid var(--accent);
    border-radius: 3px;
    padding: 2.6mm 3.2mm;
    margin: 0 0 4mm;
    font-size: 7.8pt;
    line-height: 1.45;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  pre code {
    font-family: "SF Mono", Menlo, Consolas, monospace;
    background: none; border: 0; padding: 0; font-size: inherit; color: #1a1f2b;
  }
  code {
    font-family: "SF Mono", Menlo, Consolas, monospace;
    background: #eef1f6;
    border: 1px solid #e2e6ee;
    border-radius: 2.5px;
    padding: 0.2mm 1mm;
    font-size: 8.3pt;
    color: #17325c;
  }

  blockquote {
    margin: 0 0 4mm;
    padding: 2.6mm 3.5mm;
    background: var(--warn-bg);
    border-left: 3px solid #e0a516;
    border-radius: 3px;
    color: #4a3a12;
    font-size: 8.9pt;
    break-inside: avoid;
  }
  blockquote p:last-child { margin-bottom: 0; }
  blockquote strong { color: #6a4c05; }

  hr { border: 0; border-top: 1px solid var(--line-soft); margin: 6mm 0; }
`;

// --- Deckblatt ---------------------------------------------------------------

const coverHtml = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<title>${coverTitle}</title>
<style>
  @page { size: A4; margin: 0; }
  ${styles}
  .cover {
    width: 210mm; height: 297mm;
    padding: 32mm 22mm 20mm 22mm;
    display: flex; flex-direction: column;
    background: linear-gradient(158deg, #101526 0%, #1b2440 52%, #26337d 100%);
    color: #fff;
  }
  .kicker {
    font-size: 10pt; letter-spacing: 0.3em; text-transform: uppercase;
    color: #9fb2ff; font-weight: 600;
  }
  .rule { width: 62mm; height: 3px; background: #6f8cff; margin: 8mm 0 10mm; border-radius: 2px; }
  .cover h1 {
    font-size: 30pt; line-height: 1.16; margin: 0 0 8mm;
    font-weight: 700; letter-spacing: -0.015em; color: #fff;
    border: 0; padding: 0;
  }
  .sub { font-size: 11.5pt; color: #c3cdf5; line-height: 1.5; max-width: 132mm; }
  .spacer { flex: 1; }
  .badge {
    align-self: flex-start;
    border: 1px solid #ffb84d; color: #ffce85;
    padding: 2mm 4.5mm; border-radius: 3px;
    font-size: 8.4pt; letter-spacing: 0.09em; text-transform: uppercase; font-weight: 600;
    margin-bottom: 9mm;
  }
  .meta {
    border-top: 1px solid rgba(255,255,255,0.22);
    padding-top: 7mm;
    display: grid; grid-template-columns: 1fr 1fr; gap: 6mm 8mm;
    font-size: 9.4pt;
  }
  .meta dt {
    text-transform: uppercase; letter-spacing: 0.11em; font-size: 7.4pt;
    color: #8fa3e8; margin-bottom: 1.5mm;
  }
  .meta dd { margin: 0; color: #fff; font-weight: 500; }
</style></head><body>
<div class="cover">
  <div class="kicker">${coverKicker}</div>
  <div class="rule"></div>
  <h1>${coverTitle}</h1>
  <div class="sub">${subtitle}</div>
  <div class="spacer"></div>
  <div class="badge">Vertraulich · Schutzklasse K3</div>
  <dl class="meta">
    <div><dt>Stand</dt><dd>${today}</dd></div>
    <div><dt>Version</dt><dd>1.0 — Planungsdokument</dd></div>
    <div><dt>Geltungsbereich</dt><dd>lovedis.de · Mara-Plattform · Data Warehouse</dd></div>
    <div><dt>Nächste Prüfung</dt><dd>Januar 2027</dd></div>
  </dl>
</div>
</body></html>`;

// --- Inhalt ------------------------------------------------------------------

const bodyHtml = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<title>${rawTitle}</title>
<style>@page { size: A4; } ${styles}</style>
</head><body><main class="content">
${body}
</main></body></html>`;

// --- Rendern -----------------------------------------------------------------

const chromePath = findChrome();
if (!chromePath) {
  console.error("Kein Chrome/Chromium gefunden. Bitte Google Chrome installieren.");
  process.exit(1);
}

const stamp = Date.now();
const tmpCover = path.join(tmpdir(), `lovedis-cover-${stamp}.html`);
const tmpBody = path.join(tmpdir(), `lovedis-body-${stamp}.html`);
await writeFile(tmpCover, coverHtml, "utf8");
await writeFile(tmpBody, bodyHtml, "utf8");

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--no-sandbox", "--font-render-hinting=none"],
});

const headerTemplate = `
  <div style="width:100%;font-family:-apple-system,Helvetica,Arial,sans-serif;
              font-size:7pt;color:#9099ab;padding:0 16mm;
              display:flex;justify-content:space-between;">
    <span>Lovedis · Sicherheits- &amp; Data-Warehousing-Konzept</span>
    <span>Vertraulich — K3</span>
  </div>`;

const footerTemplate = `
  <div style="width:100%;font-family:-apple-system,Helvetica,Arial,sans-serif;
              font-size:7pt;color:#9099ab;padding:0 16mm;
              display:flex;justify-content:space-between;">
    <span>Stand ${today}</span>
    <span>Seite <span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>`;

try {
  // Inhalt
  const bodyPage = await browser.newPage();
  await bodyPage.goto(`file://${tmpBody}`, { waitUntil: "load" });
  await bodyPage.evaluate(() => {
    // Das erste H2 soll keine zusätzliche Leerseite erzeugen.
    const firstH2 = document.querySelector(".content h2");
    if (firstH2) firstH2.classList.add("no-break");

    // Inhaltsverzeichnis zweispaltig setzen.
    const tocHeading = [...document.querySelectorAll("h1, h2, h3")].find((h) =>
      /^inhalt(sverzeichnis)?$/i.test(h.textContent.trim())
    );
    const list = tocHeading?.nextElementSibling;
    if (list && /^(OL|UL)$/.test(list.tagName)) list.classList.add("toc-list");

    // Breite Tabellen kompakter setzen.
    for (const table of document.querySelectorAll("table")) {
      const cols = table.querySelector("tr")?.children.length ?? 0;
      if (cols >= 6) table.classList.add("wide");
    }
  });

  const bodyPdf = await bodyPage.pdf({
    format: "A4",
    printBackground: true,
    displayHeaderFooter: !flags["no-header"],
    headerTemplate,
    footerTemplate,
    margin: { top: "17mm", right: "16mm", bottom: "15mm", left: "16mm" },
  });

  let finalPdf = bodyPdf;

  // Deckblatt separat, damit es randlos bleibt und keine Kopfzeile erhält.
  if (!flags["no-cover"]) {
    const coverPage = await browser.newPage();
    await coverPage.goto(`file://${tmpCover}`, { waitUntil: "load" });
    const coverPdf = await coverPage.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    const merged = await PDFDocument.create();
    for (const bytes of [coverPdf, bodyPdf]) {
      const src = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(src, src.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }
    merged.setTitle(rawTitle);
    merged.setSubject("Sicherheits- und Data-Warehousing-Konzept");
    merged.setAuthor("Lovedis");
    merged.setKeywords(["Sicherheit", "DSGVO", "Data Warehouse", "Mara", "Hosting"]);
    merged.setCreationDate(new Date());
    finalPdf = await merged.save();
  }

  await writeFile(outputPath, finalPdf);

  const pageCount = (await PDFDocument.load(finalPdf)).getPageCount();
  console.log(`PDF erstellt: ${outputPath}`);
  console.log(`Seiten: ${pageCount}`);
  console.log(`Renderer: ${chromePath}`);
} finally {
  await browser.close();
  await unlink(tmpCover).catch(() => {});
  await unlink(tmpBody).catch(() => {});
}
