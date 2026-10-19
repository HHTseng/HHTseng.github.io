# Huan-Hsin Tseng

Personal academic website: <https://hhtseng.github.io/>.

Research in quantum computation, mathematical physics, and the foundations of learning, with selected publications and expository research notes.

## Site structure

- `index.html`: profile, research interests and projects, selected publications, and the research-note preview.
- `notes/topological-quantum-error-correction.html`: topology, surface codes, and a worked planar example.
- `notes/topological-qec-diagrams.tex`: accompanying LaTeX definitions, diagrams, and computations.
- `assets/`: active styles, scripts, artwork, scientific figures, and locally hosted KaTeX with its license.
- `_data/*-provenance.json`: generation notes for the conceptual topology artwork.

The site uses plain HTML, CSS, and JavaScript. No build step is required. GitHub Pages publishes the root of `master`; `.nojekyll` disables Jekyll processing.

For a local preview, run `python3 -m http.server 8000` from the repository root. Edit the HTML and assets directly, then commit and push to `master`.

Conceptual illustrations are schematic. Scientific figures retain their captions and source attribution; third-party components retain their included licenses. Only the selected bibliography and public website assets are included in this release.
