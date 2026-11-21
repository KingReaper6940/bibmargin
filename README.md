# Bibmargin

Before you cite it twice.

**[Open Bibmargin](https://bibmargin.vercel.app)**

Bibmargin is a local BibTeX duplicate-review desk. It collects explicit match signals into a browsable shelf, compares complete fields, and saves your assessment without deleting, merging or rewriting a reference.

- **Three independent signals:** citation-key collisions, literal DOI matches, and plain title + year candidates.
- **Explainable evidence:** every group shows its normalized value and the rule behind it.
- **Complete comparisons:** choose any two members; compare all fields and inspect original entry text.
- **Your review state:** unreviewed, likely duplicates, or keep separate, with a note for the whole group.
- **Portable work:** save a project, complete JSON / HTML packet, candidate CSV, summary SVG, or unchanged source.
- **Browser-local:** no uploads, analytics, accounts, external runtime libraries or browser storage.

## Output preview

![Generated Bibmargin review summary](examples/summary.svg)

This is an actual exported summary, **not an application screenshot**. Native browser rendering, accessibility, operating-system downloads and print checks are pending. A real workspace screenshot has not yet been captured.

## Run locally

Requires Node.js 22 or 24 and npm.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run build
npm run dev
```

Open [http://127.0.0.1:4221](http://127.0.0.1:4221). The static build is in `dist/`. There is no backend or environment configuration. JSDOM is a pinned development-only test dependency.

## Review a bibliography

1. Open a UTF-8 `.bib` file, paste its contents, or choose **Try sample bibliography**.
2. Select **Find candidates**. Parsing errors reject the whole scan; no partial review replaces your previous work.
3. Browse the candidate shelf. Filter by signal and review state. Groups can overlap: the same record can appear in a key-collision group and a different DOI group.
4. Open a group, then select two members to compare. All field text is available; TeX markup and macros are not rendered or evaluated.
5. Set your assessment of the **whole group**, optionally add a note, and download **Save review project** before closing.

No automatic removals, merges, preferred records, citation rewrites, attachment changes or clean-library export occur. This tool does not establish that two entries represent the same publication.

Editing source starts a fresh set of review decisions. Changing only the title or bibliography notes keeps decisions. Dirty drafts disable assessments and downloads until a successful rebuild. Failed imports keep the previous workspace; a later edit, clear or assessment cancels a pending import.

Refreshing or closing loses unsaved work. Reopen your saved JSON project to restore source, notes and assessments.

## How signals work

| Signal | Rule | Important limit |
| --- | --- | --- |
| Citation key collision | Compare keys after Unicode lowercasing | Different works can have the same key |
| Literal DOI match | Trim whitespace, remove `doi:`, `http(s)://doi.org/` or `http(s)://dx.doi.org/`, then lowercase | No identifier lookup, URL decoding or publication verification |
| Plain title + year | Strip grouping braces, NFC-normalize, lowercase, collapse whitespace; require title length ≥8 and a four-digit literal year | Titles with backslashes are skipped; punctuation and accents are retained; distinct works or editions may match |

A DOI signal requires an ASCII token shaped like `10.` plus 4–9 digits, a slash and a nonempty printable suffix, excluding braces and backslashes. This is a matching heuristic, not authoritative DOI validation.

Missing, ambiguous duplicate fields, or fields containing unresolved macros cannot provide value-match signals. Citation keys can still provide a collision signal. Literal concatenations such as `{River } # "Garden"` are joined for comparison. A macro anywhere in a field makes that entire field unresolved, including built-in month abbreviations.

“Same literal” in the comparison view means identical scanner text and literal field state. It does not mean equal rendered citations, complete records or verified metadata. Differences are highlighted with text labels as well as color.

Groups are **independent**, not transitive duplicate clusters. Assessment state applies to all members of one signal group and does not automatically transfer to overlapping groups. No-group results do not prove that a bibliography is duplicate-free.

## Supported scanner subset

Regular entries can use brace or parenthesis block delimiters. Field values support nested braces, quotes with brace-protected inner quotes, bare decimal numbers, macro tokens and `#` concatenation. Field names and entry types are case-insensitive. Duplicate fields are retained and marked ambiguous. Original spans and the complete original source are retained.

Braced `@comment` blocks and delimited `@string` / `@preamble` blocks are preserved, not evaluated or semantically validated. Outside entries, percent-to-end-of-line comments are skipped. Comments **inside** entries, undelimited or parenthesized `@comment`, unusual key syntax, malformed delimiters and unsupported values reject the scan. Backslashed braces still participate in brace matching.

This is a bounded review scanner, **not a full BibTeX / BibLaTeX validator or compiler**. It does not execute TeX, expand macros, apply crossref / xdata inheritance, parse author names, find fuzzy matches, fetch metadata, inspect PDFs or open attachment paths. Bibliographies accepted by another tool may fall outside this subset.

## Limits

Counts are UTF-16 text units unless otherwise noted.

| Boundary | Limit |
| --- | --- |
| Source | 1,000,000 units |
| Regular entries / all blocks | 1,000 / 1,500 |
| Fields per entry | 80 |
| Value / comment brace nesting | 32 |
| Concatenation parts per field | 100 |
| Citation key | 1–128 plain non-whitespace characters; restricted delimiters |
| Review title / general notes | 100 / 4,000 units |
| Group assessments / note length | 1,500 / 500 units each |
| File input | 4,000,000 bytes; source text limit still applies |
| Project input | 28,000,000 bytes / 7,000,000 units, then strict versioned schema |
| Visible shelf / scanner notes | 15 items per page; exports cover all items |

Literal unpaired UTF-16 surrogates are rejected. Original LF / CRLF endings survive metadata-only edits and original-source exports. Editing the source textarea uses its normalized line endings. No streaming or compressed files.

## Exports

| Download | Includes |
| --- | --- |
| Save review project | Complete source, title, bibliography notes and group assessments |
| Candidate CSV | Every signal group, members, keys, evidence value and assessment |
| Full JSON report | All entries, raw spans, fields, groups, scanner notes, source and assessments |
| HTML review packet | All groups with original member entries, scanner notes and full original source |
| Original .bib | Entire source unchanged |
| Summary SVG | Counts and title; not a screenshot or complete report |

Shelf filters never limit exports. CSV quotes cells and prefixes formula-leading values with an apostrophe; that intentionally changes their spreadsheet representation. Full fidelity lives in the JSON project and original source. Reports and projects may contain sensitive notes or attachment paths; no sanitization or secret detection is performed.

## Verification and examples

`npm test` runs **28 automated checks**, including nested values, macros, comments, atomic failures, resource caps, DOI normalization, overlapping signal groups, field comparison, persistent assessments, exact raw spans, 100 generated delimiter / field cases, report escaping, CSV guards and simulated DOM workflows. Real Blob payloads are checked; native file-download behavior is not.

CI runs tests and builds on Windows and Linux with Node 22 and 24. Simulated DOM checks do not establish native rendering or screen-reader usability.

`npm run example` regenerates six artifacts in [examples](examples/). The fictional sample has five entries and three groups: a key collision, a DOI match, and a three-member title/year group. Four distinct entries participate. Identifiers and publications are synthetic and unverified.

## Deploy on Vercel

Import the GitHub repository, choose **Other**, use Node **24.x**, build command `npm run build`, output directory `dist`, and an empty install command. Keep the repository root as the project root. The build uses Node's standard library and needs no dependency installation, secrets, database, paid integrations or custom domains.

`vercel.json` supplies the build settings, no-referrer and content-type protection headers, and a CSP blocking application network connections.

## Format reference

[BibTeX information and tutorial — University of Utah](https://ftp.math.utah.edu/pub/bibnet/bibtex-info.html)

MIT licensed.
