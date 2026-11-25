# Portfolio

Source for [gowelle-6yiatanstr2.qoder.website](https://gowelle-6yiatanstr2.qoder.website/), a showcase of my public repositories: PHP, Laravel and Swift tools I built because I needed them.

Plain HTML, CSS and JavaScript. No framework, no dependencies, no build step for the home page.

## Structure

| Path | What it is |
| --- | --- |
| `web/` | The site itself |
| `web/index.html` | Home page. The catalogue cards are written directly in the markup |
| `web/projects/` | One detail page per project. Generated, not hand-edited |
| `src/repos.json` | The data behind the generated detail pages |
| `tools/build-pages.mjs` | Generates `web/projects/*.html` from `src/repos.json` |

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
