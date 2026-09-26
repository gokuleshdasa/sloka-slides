# Changelog

All notable changes to this project are documented here.
This project adheres to [Semantic Versioning](https://semver.org/).

## [1.4.1]
### Fixed
- The closing line ("Thus ends the Bhaktivedanta Purport.") could break into scattered words and
  overflow the slide at large font sizes, because it was glued into the purport text and got caught
  by word-level splitting. It is now a separate, non-splittable centered element that still stays
  with the final purport chunk.

## [1.4.0]
### Added
- **Part counts on split sections.** When a purport, translation or word-for-word runs over more
  than one slide, its heading now shows "1 of N" on the very first part, "2 of N" on the next, and
  so on — so from the first slide you know how many parts there are.

### Removed
- The "· continued" label on continuation slides (replaced by the part count above).

## [1.3.0]
### Changed
- **Per-section size is now global and saved automatically.** `+` / `−` on a slide adjust the size
  of that section (verse, word-for-word, translation or purport) — the same values as the
  "Relative size of each section" sliders — and the change is saved to your settings with no button.
  Every verse you open afterwards uses the last size for each section. `Alt`+`+` / `Alt`+`−` still
  change the overall size; `0` resets the current section, `Alt`+`0` the overall size.
- Removed the earlier per-slideshow size override in favour of this remembered per-section size.

## [1.2.0]
### Added
- **Top verse-number header visibility** setting — *Verse slides only* (default), *All slides*, or
  *Off*. By default the header now shows only on the verse (Devanāgarī/transliteration) slide and is
  hidden on word-for-word, translation and purport slides; the bottom corner reference is unchanged.
  When the header is hidden, that slide's content is measured against the taller area, so it uses the
  freed space instead of leaving a gap.

### Changed
- **Per-slide text size is now truly slide-specific.** `+` / `−` resize only the section shown on the
  current slide (the verse, the word-for-word, the translation, or the purport) rather than the whole
  verse. `Alt`+`+` / `Alt`+`−` still resize everything; `0` resets the current slide, `Alt`+`0` all.

## [1.1.0]
### Added
- **Editable verse numbers** — click the ✎ on a verse heading, or press `E`, to correct a
  number in place (Enter saves, Esc cancels). Fixes generic labels like "Text 1, Text 2" on
  multi-verse slides; the change is saved with the slideshow.
- **Per-slide text size** — `+` / `−` (and the toolbar A± buttons) now resize only the current
  slide. Hold `Alt` (`Alt`+`+` / `Alt`+`−`, or Alt-click A±) to resize every slide. `0` resets
  the current slide, `Alt`+`0` resets all. Per-slide sizes are remembered per slideshow.

### Changed
- Shortcut help, the toolbar tooltips, the settings "How to use" page and the README updated
  to describe per-slide vs. all-slide sizing and verse-number editing.

## [1.0.0]
Initial public release.

### Presentation
- Clean slideshow of verse, transliteration, word-for-word, translation and purport.
- Ten themes (five light, five dark) plus a custom colour picker and four ambient backgrounds.
- Full typography control: fonts, size, line/letter/word spacing, per-section scaling, alignment.
- Keyboard, presentation-clicker and touch navigation; progress bar with verse ticks; faded corner reference.
- Search & highlight, jump-to-verse, auto-advance (fixed time or reading pace), black/white screen,
  laser pointer, spotlight, click-to-highlight.

### Layout
- **One section per slide** (default) and **fit as much as fits** modes.
- Sentence-aware pagination that avoids orphan words; balanced word-splitting for very large fonts.
- Faded **"Purport follows"** cue after a translation whose purport is on the next slide.
- Recited **"Thus ends the Bhaktivedanta Purport."** closing line, glued to the final purport (editable, optional).

### Sources
- Built-in Vedabase.io mapping, heuristic detection for other sites, and a point-and-click site mapper.
- Single verse, selected verses, full chapter, verses collected across pages, linked pages, and pasted text.

### Export
- **Export the whole slideshow as a PDF** — one slide per page, colours preserved, no external libraries.
- Export/import decks and settings + site mappings as JSON.
