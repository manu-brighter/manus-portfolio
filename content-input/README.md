# content-input/ — Roh-Asset-Ablage

> **Dieses Verzeichnis ist gitignored.** Hier landen alle Roh-Inputs (Originalfotos, Screenshots, Audio-Loops) bevor sie durch die Build-Pipeline (kommt in Plan-Phase 9) zu optimierten `public/`-Outputs verarbeitet werden.

---

## Struktur

```
content-input/
├─ README.md                          ← du liest sie gerade
├─ profile/
│   └─ profile-picture.jpg            ← Manuels Portraitfoto (für About-Section)
├─ photography/
│   └─ source/                        ← die ~29 Original-JPEGs aus
│                                       Downloads\portfolio input\Example Bilder
│       ├─ DSC01805.jpg
│       ├─ DSC01833.jpg
│       └─ ...
└─ joggediballa/
    ├─ joggediballa-story.mdx         ← Original-Story von Manu (Quelle für Case Study)
    └─ screenshots/                   ← TODO Manu (siehe content-briefing.md §5.4)
        ├─ home.jpg
        ├─ events.jpg
        ├─ team.jpg
        ├─ shotcounter.jpg
        ├─ admin-dashboard.jpg
        ├─ overlay-stream.jpg
        └─ statistic.jpg
```

---

## Wer legt was hierhin?

### Manu (manuell, einmalig)

- [x] `profile/profile-picture.jpg` — kopiere von `Downloads\portfolio input\Profilfoto\Profilfoto.JPEG`
- [x] `photography/source/*.jpg` — kopiere alle JPEGs aus `Downloads\portfolio input\Example Bilder\`
- [x] `joggediballa/joggediballa-story.mdx` — kopiere von `Downloads\portfolio input\joggediballa-story.mdx`
- [x] `joggediballa/screenshots/*.jpg` — neu erstellen, sobald Joggediballa-Plattform gescreenshotet ist (Liste siehe `docs/content-briefing.md` §5.4)

### Claude (automatisch, beim Implementieren)

Aktuell keine. Audio-Loop wurde gestrichen, weil das ursprünglich geplante Audio-Blob-Playground-Experiment thematisch nicht zum Riso/Print-Narrativ passte (siehe `docs/content-briefing.md` §7.1).

---

## Build-Pipeline

Live in `scripts/optimize-assets.mjs` (`.mjs`, nicht `.ts` — kein ts-runner installiert). Deklarative Tasks pro Asset-Gruppe.

```bash
# Alle Gruppen
node scripts/optimize-assets.mjs

# Nur eine Gruppe
node scripts/optimize-assets.mjs photography
node scripts/optimize-assets.mjs profile
node scripts/optimize-assets.mjs joggediballa
node scripts/optimize-assets.mjs portfolio
```

Tasks ohne vorhandene Source-Datei werden mit `⊘ skipped` geloggt, nicht gefehlt — pratisch wenn nur eine einzelne Gruppe regeneriert werden soll.

### Portrait-Workflow (`profile`)

Wenn das Original wieder verfügbar ist:

1. Datei ablegen unter `content-input/profile/profile-picture.jpg`
2. Ausführen: `node scripts/optimize-assets.mjs profile`
3. Generiert in `public/profile/`:
   - 3× AVIF (480w, 800w, 1200w) @ q=60
   - 3× WebP (480w, 800w, 1200w) @ q=80
   - 2× JPG (800w für `<img>`-Fallback in `Portrait.tsx`, 1200w für JSON-LD `Person.image.contentUrl` und Image-Sitemap) @ q=90 mozjpeg
   - Alle mit EXIF Copyright + Artist
   - Naming: `manuel-heller-portrait-{width}w.{ext}` — Filename trägt das SEO-Keyword für Google Image Search

Aktuell ist das 1200w JPG aus dem WebP rekonstruiert (Original ging verloren). Sobald das Original wieder da ist, ersetzt ein Lauf des Scripts alle Varianten in einem Rutsch durch frische High-Fidelity-Encodes.

### Was wird wo eingelesen

| Gruppe | Source-Pfad | Output-Dir |
|---|---|---|
| `photography` | `content-input/photography/source/DSC*.jpg` | `public/photography/` |
| `profile` | `content-input/profile/profile-picture.jpg` | `public/profile/` |
| `portfolio` | `public/projects/portfolio/source/homepage-landscape.png` | `public/projects/portfolio/` |
| `joggediballa` | `public/projects/joggediballa/source/*-lightmode-*.png` | `public/projects/joggediballa/` |

Photography + profile-Sources sind gitignored (große Originale, semi-private Inhalte). Portfolio + joggediballa-Sources liegen im Repo, weil's kleinere PNG-Screenshots sind und Re-Generierbarkeit wichtiger ist als Größe.

Nur die `public/`-Outputs werden gecommittet.

---

## Warum gitignored?

- **Größe**: einzelne Fotos sind 10–37 MB. 24 davon × 4 Sprachen × Branches = unhaltbar im Git.
- **Privacy**: Joggediballa-Admin-Screenshots können personenbezogene Daten enthalten. Auch Profilfoto ist semi-privat.
- **Workflow**: optimierte Outputs sind das Artefakt, nicht die Roh-Inputs.

Falls jemand das Repo neu klont und die Site bauen will, braucht er entweder:
1. die Roh-Inputs von Manu (privat geteilt), oder
2. die bereits optimierten `public/`-Files aus dem letzten Commit

Beides ist okay — die Roh-Inputs sind nur für Re-Processing nötig.
