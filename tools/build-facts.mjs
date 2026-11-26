import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const jsonPath = join(root, "src", "repos.json");
const indexPath = join(root, "web", "index.html");

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

const shortDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
};
const longDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
};
const num = (value) => Number(value).toLocaleString("en-US");

async function getJson(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "user-agent": "gowelle-portfolio/1.0", ...headers } });
    if (!res.ok) throw new Error(`${url} responded ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const githubHeaders = token
  ? { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" }
  : { accept: "application/vnd.github+json" };

const data = JSON.parse(await readFile(jsonPath, "utf8"));
const warnings = [];
let stars = 0;

for (const repo of data.repos) {
  const owner = repo.source || "gowelle";
  try {
    const meta = await getJson(`https://api.github.com/repos/${owner}/${repo.slug}`, githubHeaders);
    stars += meta.stargazers_count || 0;
    if (meta.pushed_at) repo.updated = shortDate(meta.pushed_at);
    if (meta.language) repo.language = meta.language;

    const latest = await getJson(`https://api.github.com/repos/${owner}/${repo.slug}/releases/latest`, githubHeaders);

    if (repo.downloadsNote === "GitHub Releases") {
      if (latest.tag_name) repo.version = latest.tag_name;
      if (latest.published_at) repo.releaseDate = shortDate(latest.published_at);
      const releases = await getJson(`https://api.github.com/repos/${owner}/${repo.slug}/releases?per_page=100`, githubHeaders);
      repo.downloads = releases.reduce(
        (sum, release) => sum + (release.assets || []).reduce((assetSum, asset) => assetSum + (asset.download_count || 0), 0),
        0
      );
    }
  } catch (error) {
    warnings.push(`${repo.slug}: GitHub ${error.message}`);
  }

  if (!repo.downloadsNote) {
    try {
      const packagist = await getJson(`https://packagist.org/packages/${owner}/${repo.slug}.json`);
      const pkg = packagist.package;
      repo.downloads = pkg.downloads?.total ?? repo.downloads;
      const stable = Object.values(pkg.versions || {})
        .filter((version) => version.version && !version.version.startsWith("dev-") && !version.version.includes("-dev"))
        .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
      if (stable.length) {
        repo.version = stable[0].version;
        if (stable[0].time) repo.releaseDate = shortDate(stable[0].time);
      }
    } catch (error) {
      warnings.push(`${repo.slug}: Packagist ${error.message}`);
    }
  }
}

const composer = data.repos.filter((repo) => !repo.downloadsNote);
const packagistTotal = composer.reduce((sum, repo) => sum + (repo.downloads || 0), 0);
const paddock = data.repos.find((repo) => repo.downloadsNote === "GitHub Releases");
const today = new Date();
const pkgCount = composer.length;

data.snapshot = shortDate(today);
await writeFile(jsonPath, `${JSON.stringify(data, null, 2)}\n`);

execFileSync(process.execPath, [join(here, "build-pages.mjs")], { stdio: "inherit" });

const blocks = {
  stats: [
    `      <!-- facts:stats -->`,
    `      <dl class="stats">`,
    `        <div><dt>Repositories</dt><dd>${data.repos.length}</dd></div>`,
    `        <div><dt>Composer packages</dt><dd>${pkgCount}</dd></div>`,
    `        <div><dt>Packagist downloads</dt><dd>${num(packagistTotal)}</dd></div>`,
    `        <div><dt>GitHub stars</dt><dd>${num(stars)}</dd></div>`,
    `      </dl>`,
    `      <!-- /facts:stats -->`,
  ].join("\n"),
  now: [
    `      <!-- facts:now -->`,
    ...(paddock
      ? [
          `      <div class="now-item">`,
          `        <p class="now-label">Shipping</p>`,
          `        <p class="now-value">${paddock.name} ${paddock.version}</p>`,
          `        <p class="now-sub">released ${paddock.releaseDate}</p>`,
          `      </div>`,
        ]
      : []),
    `      <div class="now-item">`,
    `        <p class="now-label">Maintaining</p>`,
    `        <p class="now-value">${pkgCount === 6 ? "Six" : pkgCount} Laravel packages</p>`,
    `        <p class="now-sub">${num(packagistTotal)} downloads on Packagist</p>`,
    `      </div>`,
    `      <!-- /facts:now -->`,
  ].join("\n"),
  snapshot: [
    `  <!-- facts:snapshot -->`,
    `  <p>Repository details are a GitHub and Packagist snapshot taken <time datetime="${today.toISOString().slice(0, 10)}">${longDate(today)}</time>.</p>`,
    `  <!-- /facts:snapshot -->`,
  ].join("\n"),
};

let html = await readFile(indexPath, "utf8");
let replaced = 0;
for (const [name, block] of Object.entries(blocks)) {
  const pattern = new RegExp(`^[ \\t]*<!-- (?:facts:)?${name} -->[\\s\\S]*?<!-- /(?:facts:)?${name} -->`, "m");
  if (!pattern.test(html)) {
    warnings.push(`index.html: no ${name} markers`);
    continue;
  }
  html = html.replace(pattern, block);
  replaced += 1;
}
await writeFile(indexPath, html);

for (const warning of warnings) console.log(`::warning::${warning}`);
console.log(
  `Facts: ${data.repos.length} repositories, ${pkgCount} packages, ${num(packagistTotal)} Packagist downloads, ${num(stars)} stars, snapshot ${data.snapshot}; ${replaced}/3 home blocks updated.`
);
