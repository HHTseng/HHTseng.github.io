# hhtseng.github.io

Personal academic website of Huan-Hsin Tseng — quantum computation, physics, and mathematics.

A static research website with a main profile page and standalone notes: plain HTML, CSS, and a little vanilla JavaScript. No build step is needed to serve it; GitHub Pages publishes the files as they are (`.nojekyll` turns Jekyll off).

## What is on the page

| Section | Notes |
|---|---|
| Opening | Cosmic artwork with geodesic trajectories, moving dust, and fibre accents. Six equations from Bleecker, *Gauge Theory and Variational Principles*, are drawn glyph by glyph, each with a short physics caption. Pause control and reduced-motion support. The overlay is decorative. |
| 01 About · 02 Interests | Research profile, education, appointments, and research interests. |
| §1 Research notes | Quantum error correction through cellular topology, stabilizer invariant subspaces, and the Knill–Laflamme condition; links to the full expository note. |
| 03 Research | §2 molecular quantum-logic spectroscopy and control; §3 physical noise and device protection; §4 learned detector response and Monte Carlo simulation with UConn; §5 Observable Geometry, ANO, DANO, quasi-polar analysis, and transfer learning; §6 LVA, optimal transport, and g-SNE; §7 gauge geometry and spacetime. |
| 04 Connections | The bundle picture in gauge theory and in observable geometry, a methods dictionary, and a research tree. |
| 05 Publications | Generated from `_data/publications.json`, with filters. |
| 06 Experience · Contact | Positions, organizing, mentoring, teaching, reviewing; contact links. |

Dark theme by default, with a light theme toggle (remembered per browser).

The 2026-10-19 update places quantum error correction first, followed by molecular control, physical noise, and the standalone detector-response project. The opening equations include concise physics captions.

## Preview locally

```bash
npx live-server --port=8000
```

Then open <http://localhost:8000>. A no-reload alternative is `python3 -m http.server 8000`.

## Edit content

* **Text, chapters, figures** — edit `index.html` directly. Math uses `\( … \)` inline and `\[ … \]` display (KaTeX, vendored in `assets/vendor/katex`).
* **Publications** — `_data/publications.json` holds the bibliography; `_data/publication-selection.json` lists the IDs actually shown on the website. Edit that shortlist, then run `python3 tools/build.py`. It rewrites the block between `<!-- BEGIN:PUBLICATIONS -->` and `<!-- END:PUBLICATIONS -->` in `index.html`. Only listed entries are rendered. `"cats"` is any of `q` (quantum), `l` (learning), `g` (gravity). The current 15-entry shortlist uses the CV's three 2026 selections, three 2025 quantum papers, two 2023 quantum papers, and selected earlier ML/gravity work.
* **Opening equations** — edit `_data/opening-equations.src.json` (TeX, title, note, source), then:

  ```bash
  npm install mathjax-full@3.2.2
  node tools/render_equations.cjs
  python3 tools/build.py
  ```

  The equations are stored as glyph-outline SVG so the page can draw them without loading a TeX engine.
* **Scientific figures** — `assets/img/research/*.webp` (white-backed, from the papers’ author/arXiv versions or original source art).
* **Conceptual figures** — `assets/img/research/concepts/*-v3.webp` contains the current restrained 3D illustrations with neutral backgrounds and mathematical annotations. The supplied device stack and detector-response artwork are retained. See `docs/research-figures.md` for current assets, provenance, scope, and the complete built-in image-generation prompt set. ANO's original Figures 2 and 3 appear in an expandable source section. Earlier SVGs, raster versions, and their generation scripts are archived assets; the page uses version 3.
* **Quasi-polar figure** — `assets/img/research/concepts/quasi-polar-paper-fig1.webp` is the original paper's Figure 1 (arXiv:2607.27051v1), replacing the conceptual illustration. Main research figures are capped at 680 px, conceptual artwork at 600 px, and this square source figure at 420 px. Both remain responsive and enlarge in the viewer.
* **Artwork** — `assets/img/art/` (AI-generated illustrations; captioned as such on the page). The overlay in `assets/js/cosmos.js` locates the black hole and fibres in source-image pixels (`ART` at the top of the file); update those if the artwork changes.

Research descriptions use a direct scientific question, a short explanation, and the relevant equations. For ongoing projects, keep descriptions at the level of the physical problem and established methods; do not add implementation architecture, tuning choices, internal branches, or unpublished performance numbers. The detector-response diagram is a schematic from the supplied project documentation, not a result plot.

KaTeX 0.16.11 is vendored with its matching fonts, auto-render extension, and license. The missing runtime files were restored from the official npm distribution with its published integrity checked.

## Deploy to GitHub Pages

Published at <https://hhtseng.github.io/> from `HHTseng/HHTseng.github.io`, branch `master`, root `/`, with `.nojekyll`. Git history retains earlier versions of the website.

The public release contains the approved static pages, the research note and its TeX companion, active assets, required licenses, and sanitized artwork provenance. This local working folder also contains internal documentation, the full bibliography, build tools, and obsolete artwork; those were excluded from publication. The exact published-file list and deployment links are recorded locally in `docs/github-pages-deployment.json`.

For future updates, prepare a clean checkout from the repository, copy only the approved public release files, commit, and push to `master`. GitHub Pages deploys automatically. Verify the live homepage, note, figures, and mathematics after the deployment succeeds.

## Files

```
index.html                 the page
404.html                   not-found page
assets/css/site.css        styles (dark + light themes, responsive)
assets/js/site.js          math rendering, theme, navigation, filters, lightbox, DANO widget
assets/js/cosmos.js        geodesic trajectories, dust, and fibre accents for the opening
assets/js/equations.js     drawing sequence for the opening equations
assets/img/                artwork, research figures, favicon, social card
assets/vendor/katex/       KaTeX 0.16.11 (MIT)
_data/                     publications and opening-equation sources
tools/                     build.py, render_equations.cjs
```
