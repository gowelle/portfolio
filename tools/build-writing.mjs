import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const indexPath = join(root, "web", "index.html");

const FEED = "https://medium.com/feed/@chiefmfalme";
const LIMIT = 6;
const START = "<!-- writing:start -->";
const END = "<!-- writing:end -->";

const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const decode = (value) =>
  value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#x27;", "'")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&");

const stripTags = (html) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

const cdata = (raw) => raw.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();

const firstSentence = (text) => {
  const match = text.match(/^(.{25,}?[.!?])(?:\s|$)/);
  const sentence = match ? match[1] : text;
  if (sentence.length <= 130) return sentence;
  const cut = sentence.slice(0, 130);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "")}…`;
};

// Medium repeats the title as the first line of the body; drop it before choosing a dek.
const withoutTitle = (text, title) => {
  if (!text.toLowerCase().startsWith(title.toLowerCase())) return text;
  return text.slice(title.length).replace(/^[\s—–-]+/, "").trim();
};

async function readFeed() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(FEED, {
      signal: controller.signal,
      headers: { "user-agent": "gowelle-portfolio/1.0 (+https://github.com/gowelle/portfolio)" },
    });
    if (!res.ok) throw new Error(`feed responded ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

const posts = (xml) =>
  [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((match) => {
      const block = match[1];
      const grab = (tag) => {
        const found = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
        return found ? cdata(found[1]) : "";
      };
      const title = stripTags(grab("title"));
      const link = grab("link").replace(/\?.*$/, "");
      const body = stripTags(grab("content:encoded") || grab("description"));
      const date = new Date(grab("pubDate"));
      return { title, link, dek: firstSentence(withoutTitle(body, title)), date };
    })
    .filter((post) => post.title && post.link.startsWith("https://medium.com/"))
    .sort((a, b) => b.date - a.date)
    .slice(0, LIMIT);

const render = (items) =>
  [
    START,
    `    <ul class="writing-list">`,
    ...items.map(
      (post) => `      <li>
        <a href="${esc(post.link)}" target="_blank" rel="noopener noreferrer">
          <span class="writing-title">${esc(post.title)}</span>
          <span class="writing-dek">${esc(post.dek)}</span>
        </a>
        <span class="writing-source">Medium&nbsp;&#8599;</span>
      </li>`
    ),
    `    </ul>`,
    `    ${END}`,
  ].join("\n");

let items;
try {
  items = posts(await readFeed());
} catch (error) {
  console.log(`::warning::Could not read the Medium feed (${error.message}); leaving Writing unchanged.`);
  process.exit(0);
}

if (!items.length) {
  console.log("::warning::The Medium feed returned no posts; leaving Writing unchanged.");
  process.exit(0);
}

const html = await readFile(indexPath, "utf8");
const start = html.indexOf(START);
const end = html.indexOf(END);
if (start === -1 || end === -1 || end < start) {
  console.error(`Missing ${START} / ${END} markers in web/index.html`);
  process.exit(1);
}

const next = `${html.slice(0, start)}${render(items)}${html.slice(end + END.length)}`;
if (next === html) {
  console.log(`Writing is current (${items.length} posts).`);
} else {
  await writeFile(indexPath, next);
  console.log(`Wrote ${items.length} posts to web/index.html`);
}
