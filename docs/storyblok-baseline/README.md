# Storyblok Homepage Baseline — LOVEDIS

Point-in-time snapshot of the public homepage (**lovedis.de**) and its Storyblok
content, captured as a reference "baseline" before any future changes.

## Snapshot metadata

- **Captured:** 2026-08-04 (Europe/Berlin)
- **Space:** `LOVEDIS` — id `288104308443570`, domain `https://lovedis.de/`
- **Region / API:** EU (`https://mapi.storyblok.com`, delivery `https://api.storyblok.com`)
- **Delivery cache version (cv):** `1785844862`
- **Content counts:** 126 stories + 7 folders (133 index entries). Root pages:
  `home`, `startups`, `corporates`, `marketplace` (folder), `coworking`,
  `ecosystem`. Content types incl. `partner` (42), `page` (27), `event` (13),
  `news-post` (9), `blog-post` (3), listings, `site-settings`, `seo-settings`,
  `legal-page`.

## Files

| File | What it is |
|---|---|
| `lovedis-homepage-baseline-fullpage.png` | Full-page screenshot of the live homepage (visual baseline) |
| `home.published.json` | Homepage story as published via the Delivery API (as-rendered) |
| `home.story.json` | Homepage story from the Management API (authoritative, all fields) |
| `page.{startups,corporates,coworking,ecosystem}.json` | Other key root landing pages (published) |
| `site-settings.json` | Global site settings (nav, footer, etc.) |
| `components.json` | Full Storyblok content model (component/blok schemas) |
| `stories-index.json` | Index of every story/folder (id, uuid, slug, parent, component) |
| `space.json` | Space configuration/limits |

## How this baseline was produced

Read-only pulls using the tokens stored in `.env`
(`STORYBLOK_DELIVERY_TOKEN`, `STORYBLOK_MANAGEMENT_TOKEN`) — the homepage story,
key root pages, the content model, and a full story index — plus a full-page
screenshot of `https://lovedis.de/`.

## Using the baseline later

- **Compare:** re-pull the same endpoints and `diff` against these JSON files to
  see exactly what changed since the baseline.
- **Restore a story:** `PUT https://mapi.storyblok.com/v1/spaces/288104308443570/stories/{id}`
  with the `story` object from the corresponding JSON here (Management token).
- **Visual regression:** re-screenshot the homepage and compare against
  `lovedis-homepage-baseline-fullpage.png`.

> Note: JSON here reflects the published content at capture time. It is a
> reference snapshot, not a live mirror — nothing here is written back to
> Storyblok automatically.
