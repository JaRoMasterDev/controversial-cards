# Licence for the Classic and Family card sets

The card sets in this folder (`*.json`) are adapted from the free print-and-play decks of
**Cards Against Humanity** by **Cards Against Humanity, LLC** (https://www.cardsagainsthumanity.com/).
Each file's `source` field names its edition and licence.

| Files | Edition | Licence |
| --- | --- | --- |
| `en-us.json`, `en-gb.json`, `en-ca.json`, `en-au.json`, `en-intl.json` | US (2022), UK, Canadian, Australian and International print-and-play editions | [CC BY-NC-SA 2.0](https://creativecommons.org/licenses/by-nc-sa/2.0/), as stated on the editions' terms page |
| `en-family.json` | Family Edition print-and-play deck (version 1.1) | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), the licence the publisher states for its free downloads |
| `de.json`, `es.json`, `es-ar.json`, `pt-br.json`, `pt-pt.json`, `ca.json`, `gl.json`, `it.json`, `nl.json`, `el.json`, `he.json`, `ro.json`, `ru.json`, `cs.json`, `tr.json` | German, Spanish (Spain and Argentina), Portuguese (Brazil and Portugal), Catalan, Galician, Italian, Dutch, Greek, Hebrew, Romanian, Russian, Czech and Turkish print-and-play editions | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), the licence the publisher states for its free downloads. These editions print: "Copyright 2011-2021 Cards Against Humanity, LLC." |

## What was changed

- The printed cards were converted to JSON: one list of questions (each blank written as `_`) and one
  list of answers per edition.
- Print-only elements were removed: brand marks, cut lines and "pick" badges.
- Text-extraction errors were corrected against the printed cards. Cards that name the original game,
  and cards that ask for more answers than they have blanks, were left out. The card text is otherwise
  unchanged.

## Terms for these files

These adapted card sets are shared under the same licence as the edition they come from:

- **Attribution:** credit Cards Against Humanity, LLC as the original author when you share them.
- **NonCommercial:** don't sell them or use them for commercial purposes. That includes this app
  while it ships these files.
- **ShareAlike:** if you change and share them, use the same licence.

This project is not affiliated with, sponsored or endorsed by Cards Against Humanity, LLC.
"Cards Against Humanity" is a trademark of Cards Against Humanity, LLC. It is used here only to
credit the original work, as the licences require.

The rest of this repository, including the original Core and Office Chaos sets, is not covered by
these licences.
