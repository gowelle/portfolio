import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const data = JSON.parse(await readFile(join(root, "src", "repos.json"), "utf8"));
const outDir = join(root, "web", "projects");

const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const bySlug = new Map(data.repos.map((repo) => [repo.slug, repo]));
const favicon =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230e1320'/%3E%3Crect x='10' y='24' width='44' height='16' fill='none' stroke='%23f1ece2' stroke-width='4' rx='8'/%3E%3Crect x='10' y='24' width='28' height='16' fill='%23ff8a4c'/%3E%3C/svg%3E";

const header = `
<header class="topbar">
  <a class="brand" href="/index.html">
    <span class="brand-mark" aria-hidden="true">GJ</span>
    <span class="brand-name">Gowelle John</span>
  </a>
  <nav class="topnav" aria-label="Primary">
    <a href="/index.html#catalogue">Catalogue</a>
    <a href="/index.html#about">About</a>
    <a href="/index.html#writing">Writing</a>
    <a href="/index.html#contact">Contact</a>
    <a href="https://github.com/gowelle" target="_blank" rel="noopener noreferrer">GitHub&nbsp;&#8599;</a>
  </nav>
</header>`;

const footer = `
<footer class="footer">
  <p>&copy; 2026 John Gowelle. Built by hand.</p>
  <p>Project facts are a GitHub and Packagist snapshot taken ${data.snapshot}.</p>
  <p><a href="https://github.com/gowelle" target="_blank" rel="noopener noreferrer">github.com/gowelle&nbsp;&#8599;</a></p>
</footer>`;

const linkRow = (repo) =>
  repo.links
    .map(
      (link) =>
        `<a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)}&nbsp;&#8599;</a>`
    )
    .join("\n            ");

const factRows = (repo) => {
  const rows = [
    `<div><dt>Latest release</dt><dd>${esc(repo.version)}<span class="fact-sub">${esc(repo.releaseDate)}</span></dd></div>`,
    `<div><dt>Licence</dt><dd>${esc(repo.license)}</dd></div>`,
    `<div><dt>Language</dt><dd><span class="lang"><i class="dot" style="--dot:${esc(repo.langColor)}"></i>${esc(repo.language)}</span></dd></div>`,
  ];
  if (typeof repo.downloads === "number") {
    rows.push(
      `<div><dt>Downloads</dt><dd>${repo.downloads.toLocaleString("en-US")}<span class="fact-sub">Packagist</span></dd></div>`
    );
  }
  rows.push(
    `<div><dt>Last push</dt><dd>${esc(repo.updated)}</dd></div>`
  );
  return rows.join("\n          ");
};

const figureBlock = (repo) => {
  if (!repo.images.length) return "";
  const figures = repo.images
    .map(
      (image) => `
        <figure class="shot">
          <img src="${esc(image.src)}" alt="${esc(image.alt)}" loading="lazy" width="900" height="700">
          <figcaption>${esc(image.caption)}</figcaption>
        </figure>`
    )
    .join("");
  return `
      <section class="figures" aria-label="Screenshots">
        ${figures}
      </section>`;
};

const requirementsBlock = (repo) => {
  if (!repo.requirements.length) return "";
  return `
        <p class="req-title">Runs on</p>
        <ul class="req-list">
          ${repo.requirements.map((item) => `<li>${esc(item)}</li>`).join("\n          ")}
        </ul>`;
};

const relatedBlock = (repo) => {
  const related = repo.related.map((slug) => bySlug.get(slug)).filter(Boolean);
  if (!related.length) return "";
  return `
      <section class="related" aria-labelledby="related-title">
        <h2 id="related-title">Related</h2>
        <ul class="related-list">
          ${related
            .map(
              (item) => `<li>
            <a href="/projects/${item.slug}.html">
              <span class="related-name">${esc(item.name)}</span>
              <span class="related-tag">${esc(item.tagline)}</span>
            </a>
          </li>`
            )
            .join("\n          ")}
        </ul>
      </section>`;
};

const pagerBlock = (repo) => {
  const index = data.repos.indexOf(repo);
  const prev = data.repos[(index - 1 + data.repos.length) % data.repos.length];
  const next = data.repos[(index + 1) % data.repos.length];
  return `
      <nav class="pager" aria-label="Project navigation">
        <a class="pager-link" href="/projects/${prev.slug}.html" rel="prev">
          <span>Previous</span>
          <strong>${esc(prev.name)}</strong>
        </a>
        <a class="pager-link pager-next" href="/projects/${next.slug}.html" rel="next">
          <span>Next</span>
          <strong>${esc(next.name)}</strong>
        </a>
      </nav>`;
};

const page = (repo) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(repo.name)} — Gowelle John</title>
<meta name="description" content="${esc(repo.metaDescription)}">
<meta name="theme-color" content="#0e1320">
<link rel="icon" href="${favicon}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(repo.name)} — Gowelle John">
<meta property="og:description" content="${esc(repo.metaDescription)}">
<link rel="preload" href="/fonts/BigShoulders.ttf" as="font" type="font/ttf" crossorigin>
<link rel="preload" href="/fonts/InstrumentSans.ttf" as="font" type="font/ttf" crossorigin>
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${header}

<main id="main" class="detail">
  <nav class="crumbs" aria-label="Breadcrumb">
    <a href="/index.html#catalogue">&larr; All repositories</a>
  </nav>

  <div class="detail-hero">
    <div class="detail-lead">
      <p class="eyebrow">${esc(repo.categoryLabel)} &middot; ${esc(repo.language)}</p>
      <h1>${esc(repo.name)}</h1>
      <p class="detail-tagline">${esc(repo.tagline)}</p>
      <p class="links detail-links">
            ${linkRow(repo)}
      </p>
    </div>
    <aside class="fact-card" aria-label="Project facts">
      <dl>
          ${factRows(repo)}
      </dl>
      ${typeof repo.downloads === "number" ? `<p class="fact-note">Packagist totals on ${data.snapshot}.</p>` : ""}
    </aside>
  </div>

  <div class="detail-body">
    <section class="prose-section" aria-labelledby="what-title">
      <h2 id="what-title">What it does</h2>
      ${repo.intro.map((paragraph) => `<p>${paragraph}</p>`).join("\n      ")}
    </section>
${figureBlock(repo)}

    <section class="prose-section" aria-labelledby="highlights-title">
      <h2 id="highlights-title">Highlights</h2>
      <ol class="highlight-list">
        ${repo.highlights.map((item) => `<li>${item}</li>`).join("\n        ")}
      </ol>
    </section>

    <section class="prose-section install-section" id="install" aria-labelledby="install-title">
      <h2 id="install-title">Install</h2>
      <div class="code-block">
        <pre><code>${esc(repo.install)}</code></pre>
        <button type="button" class="copy-btn" data-copy="${esc(repo.install)}">Copy</button>
        <span class="copy-status sr-only" role="status" aria-live="polite"></span>
      </div>
      ${repo.installNote ? `<p class="install-note">${repo.installNote}</p>` : ""}
      ${requirementsBlock(repo)}
    </section>
${relatedBlock(repo)}
${pagerBlock(repo)}
  </div>
</main>
${footer}

<script src="/detail.js" defer></script>
</body>
</html>
`;

await mkdir(outDir, { recursive: true });
for (const repo of data.repos) {
  await writeFile(join(outDir, `${repo.slug}.html`), page(repo), "utf8");
  console.log(`wrote projects/${repo.slug}.html`);
}
