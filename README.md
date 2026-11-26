# Portfolio

Source for [gowelle-6yiatanstr2.qoder.website](https://gowelle-6yiatanstr2.qoder.website/), also served from GitHub Pages at [gowelle.github.io/portfolio](https://gowelle.github.io/portfolio/): a showcase of my public repositories, PHP, Laravel and Swift tools I built because I needed them.

Plain HTML, CSS and JavaScript. No framework, no dependencies, no build step for the home page.

## Structure

| Path | What it is |
| --- | --- |
| `web/` | The site itself |
| `web/index.html` | Home page. The catalogue cards are written directly in the markup |
| `web/projects/` | One detail page per project. Generated, not hand-edited |
| `src/repos.json` | The data behind the generated detail pages |
| `tools/build-pages.mjs` | Generates `web/projects/*.html` from `src/repos.json` |
| `tools/build-writing.mjs` | Rewrites the Writing list from the Medium RSS feed |

## Preview locally

Serve `web/` as the root, since links are root-relative:

```sh
python3 -m http.server 4173 --directory web
```

Then open http://127.0.0.1:4173/.

## Regenerate the project pages

Edit `src/repos.json`, then:

```sh
node tools/build-pages.mjs
```

Adding a project also means adding its card to the catalogue in `web/index.html`.

## Writing

The Writing list is generated from the Medium feed, not written by hand. It refreshes itself: a scheduled GitHub Actions run fetches `https://medium.com/feed/@chiefmfalme` each morning, updates the block between `<!-- writing:start -->` and `<!-- writing:end -->` in `web/index.html`, commits if something changed, and deploys.

To refresh it yourself:

```sh
node tools/build-writing.mjs
```

The latest six posts are shown, newest first, with each post's first sentence as its dek.
