# Contributing

Thanks for helping improve Śloka Slides! It is plain HTML, CSS and vanilla JavaScript with
**no build step and no runtime dependencies**, so getting started is quick.

## Setup
1. Fork and clone the repo.
2. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and choose
   the folder containing `manifest.json`.
3. Edit files, then click **Reload** on the extension card to see changes.

The slideshow also runs standalone for fast iteration:

```bash
python3 -m http.server 8000
# open http://localhost:8000/slides/slides.html
```

It falls back to `localStorage` outside the extension and shows a sample verse.
`window.__vs` (`{ st, show, repaginate, exportPDF }`) is exposed for inspection.

## Guidelines
- Keep it dependency-free and framework-free.
- Match the existing style: small, focused functions; no comments unless the *why* is non-obvious.
- Test extraction against real pages (single verse, chapter page, selection) and check the
  slideshow at small and very large font sizes.
- Preserve accessibility: keyboard navigation, readable contrast in both light and dark themes.

## Pull requests
- One change per PR, with a short description of what and why.
- Include before/after screenshots for anything visual.
