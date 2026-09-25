# Śloka Slides — Verse Presenter

> A Chrome extension that turns scripture pages — verse number, Devanāgarī / Bengali, transliteration, word-for-word meanings, translation and purport — into a clean, distraction-free slideshow for classes and temple programs.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-green)
![No build step](https://img.shields.io/badge/build-none-lightgrey)
![Dependencies](https://img.shields.io/badge/runtime%20deps-0-brightgreen)

## What is Śloka Slides?

Śloka Slides converts scripture webpages into a presentation designed for teaching, study and temple programs. It removes webpage clutter and presents the verse, transliteration, word-for-word meanings, translation and purport as large, readable slides.

It works with Vedabase.io out of the box and can also detect scripture content on other websites or be configured with the built-in point-and-click site mapper.

## Features

- Clean presentation of verse, transliteration, word-for-word, translation and purport.
- Built-in Vedabase.io mapping plus smart detection for other scripture sites.
- Point-and-click **Map this site** tool for unusual page layouts.
- Present one verse, selected verses, a whole chapter, verses collected across pages, linked pages, or pasted text.
- One section per slide or **fit as much as fits** layout.
- Sentence-aware pagination that avoids awkward orphan words.
- Optional **Purport follows** cue after a translation.
- Optional **Thus ends the Bhaktivedanta Purport** closing line on the final purport.
- 10 themes — 5 light and 5 dark — plus custom colours and ambient backgrounds.
- Full typography controls including fonts, size, line spacing, letter spacing, word spacing and section scaling.
- Presenter tools: search, highlight, jump-to-verse, auto-advance, black/white screen, laser pointer and spotlight.
- Keyboard, presentation-clicker and touch navigation.
- Progress bar with verse ticks and current-verse reference.
- Export the complete slideshow as a PDF, one slide per page.
- Everything is stored locally. No account, server or tracking is required.

## Installation — 1 minute

### Option 1: Download the repository

1. Click **Code → Download ZIP** on this GitHub repository.
2. Extract the ZIP. The extracted folder must contain `manifest.json` at its top level.
3. Open **`chrome://extensions`** in Chrome or another Chromium browser.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the extracted `sloka-slides` folder containing `manifest.json`.
7. Pin **Śloka Slides** to your browser toolbar.

Works with Chromium-based browsers such as Chrome, Edge, Brave and Vivaldi.

### Option 2: Clone the repository

```bash
git clone https://github.com/gokuleshdasa/sloka-slides.git
```

Then load the cloned folder through **`chrome://extensions` → Developer mode → Load unpacked**.

## Everyday use

| What you want | How |
|---|---|
| Present one verse page | Click the extension icon → **Present this page** or press `Alt+Shift+S` |
| Present selected verses | Select the verses on the page → **Present selection** |
| Collect verses from multiple pages | Use **Add to collection** or `Alt+Shift+A`, then present the collection |
| Present a whole chapter from a contents page | Select the links → **Present linked pages** |
| Present copied text | Use **Paste text** |
| Configure an unsupported website | Use **Map this site** and point to each part of the scripture page |

The browser right-click menu provides the same major actions.

## Slideshow controls

| Key | Action |
|---|---|
| `→` `Space` `PgDn` | Next slide |
| `←` `PgUp` `Backspace` | Previous slide |
| `↓` / `↑` | Next / previous verse |
| `Home` / `End` | First / last slide |
| `G` or `/` | Verse list and search |
| `J` | Jump to a verse number |
| `T` | Quick tools |
| `+` `−` `0` | Increase / decrease / reset text size |
| `D` | Light / dark mode |
| `F` | Full screen |
| `A` | Auto-advance on/off |
| `Ctrl`/`⌘` + `P` | Export slideshow as PDF |
| `B` / `W` | Black / white screen |
| `L` | Laser pointer |
| `S` | Spotlight |
| `H` | Highlighter |
| `1`–`5` | Toggle Devanāgarī, transliteration, word-for-word, translation and purport |
| `?` | Show all shortcuts |

Presentation clickers work through their normal Page Up/Page Down buttons. Touch screens support swipe navigation.

## How the slides are filled

### One section per slide

By default, Verse, Word-for-word, Translation and Purport begin on separate slides. Long purports continue over multiple slides.

### Fit as much as fits

Content flows to the next slide only when the current slide is full. Short sections can share a slide.

### Tidy breaks

Purports are split at sentence boundaries whenever possible. A sentence is not intentionally broken just to leave a few words behind; genuinely oversized sentences are balanced across slides.

### Purport cue

When a translation ends and its purport begins on the next slide, a faded **Purport follows** cue can be displayed.

### Closing line

The final purport can include the recited **Thus ends the Bhaktivedanta Purport.** closing line. The feature is optional and the closing text can be edited.

Changing fonts, text size or spacing causes the presentation to re-flow automatically while keeping your current position.

## Site support

Śloka Slides uses three levels of extraction:

1. **Built-in mapping** for Vedabase.io.
2. **Smart text detection** using headings such as Translation, Purport and Synonyms, verse-number patterns and Indic-script detection.
3. **Custom site mappings** created through the point-and-click mapper.

Custom mappings can be edited, enabled or disabled, exported and shared from **Settings → Site mappings**.

## Export and backup

- **PDF:** Use Quick Tools → Export as PDF or `Ctrl`/`⌘` + `P`. Each slide becomes one PDF page.
- **Deck:** Export/import the current slideshow as JSON.
- **Settings and mappings:** Export/import settings and site mappings so they can be moved between computers or shared with other teachers.

## Project structure

```text
manifest.json          Chrome Manifest V3 configuration
src/
  common.js             Shared parsing, themes, fonts, settings and storage
  content.js            Page extraction and interactive site mapper
  background.js         Commands, context menus and collection/deck storage
slides/                 Slideshow HTML, CSS and presentation engine
options/                Settings page and live preview
popup/                  Browser toolbar popup
icons/                  Extension icons
docs/screenshots/       README screenshots
scripts/                Packaging utilities
```

## Development

There is **no build step and no runtime dependency**. The project is plain HTML, CSS and vanilla JavaScript.

1. Clone the repository.
2. Load the project folder as an unpacked extension.
3. Edit the source files.
4. Click **Reload** on the extension card in `chrome://extensions`.

The slideshow can also be run independently during development:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/slides/slides.html
```

The standalone slideshow falls back to `localStorage` when Chrome extension APIs are unavailable and provides a sample verse. `window.__vs` exposes `{ st, show, repaginate, exportPDF }` for inspection and testing.

## Privacy and permissions

Śloka Slides requests:

- **`activeTab` + `scripting`** — to read the current page when you explicitly use the extension.
- **`storage`** — to save settings, mappings and recent slideshows locally.
- **`contextMenus`** — for browser right-click actions.

Page content is processed locally in the browser. No account or application server is required.

Fonts may load from Google Fonts when online and fall back to system fonts when offline.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

Released under the [MIT License](LICENSE).

Verse text, translations and purports belong to their respective publishers. Śloka Slides only reformats pages that the user already has access to for study and teaching.
