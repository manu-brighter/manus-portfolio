# content-input/ — Roh-Asset-Ablage

> **Dieses Verzeichnis ist gitignored.** Hier landen alle Roh-Inputs (Originalfotos, Screenshots) bevor sie durch die Build-Pipeline (`scripts/optimize-assets.mjs`) zu optimierten `public/`-Outputs verarbeitet werden.

---

## Struktur

```
content-input/
├─ README.md                          ← du liest sie gerade
├─ profile/
│   └─ profile-picture.jpg            ← Manuels Portraitfoto (für About-Section)
├─ photography/
│   └─ source/                        ← die 29 Original-JPEGs aus
│                                       Downloads\portfolio input\Example Bilder
│       ├─ DSC00947.jpg                 (5 davon sind als Slides verdrahtet,
│       ├─ DSC05422-Verbessert-RR.jpg    siehe Tabelle "Was wird wo eingelesen")
│       └─ ...
├─ about/
│   └─ tiles/                         ← Object-Grid Tile-Reveals, pro Key BEIDE
│       ├─ camera-landscape.jpg         Crops: 16:9 landscape + 2:3 portrait
│       ├─ camera-portrait.jpg          (Keys: camera, audi, joggediballa,
│       └─ ...                          schnee, tauchen, pingpong)
├─ projects/
│   ├─ portfolio/source/              ← Screenshots der eigenen Homepage
│   │   ├─ homepage-landscape.png
│   │   └─ homepage-five-themes.png     (Fünf-Themen-Split für die Work-Card)
│   └─ joggediballa/source/           ← Joggediballa-Screenshots, light + dark
│       ├─ homepage-lightmode-landscape.png
│       ├─ homepage-darkmode-landscape.png
│       └─ ...
└─ joggediballa/                      ← Alt-Ablage aus Phase 8, nicht in der Pipeline
    ├─ joggediballa-story.mdx         ← Original-Story von Manu (Quelle für Case Study)
    └─ screenshots/                   ← erste Screenshot-Runde
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
- [x] `projects/portfolio/source/*.png` + `projects/joggediballa/source/*.png`: die Screenshots, die die Pipeline tatsächlich liest
- [ ] `about/tiles/{key}-landscape.jpg` + `{key}-portrait.jpg`: beide Crops pro Tile, von Manu selbst gerahmt. Aktuell live: camera, audi, joggediballa, schnee, tauchen (als PNG-Videostills). `pingpong` fehlt noch, die Kachel bleibt bis dahin dekorativ (Drop-in-Pfad steht in `src/components/about/tileReveals.ts`).

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
node scripts/optimize-assets.mjs about-tiles
```

Tasks ohne vorhandene Source-Datei werden mit `⊘ skipped` geloggt, nicht gefehlt — praktisch wenn nur eine einzelne Gruppe regeneriert werden soll. Bei `.jpg`-Tasks probiert der Runner vorher noch das `.png`-Geschwister (die Tauchen-Videostills liegen als PNG vor), bevor er die Source als fehlend meldet.

### Qualitätsstufen

Default ist `avif 60 / webp 80 / jpg 82`, überschreibbar pro Task. Wichtig:

- **Profifotos (`photography`, `about-tiles`) liegen bei `avif 60 / webp 82`.** Der frühere Bereich q38–50 zeigte bei Anzeigegrösse sichtbare Kompression, und genau diese Sektionen sollen Fotografie-Skills zeigen. Nicht wieder runterdrehen.
- Full-Bleed-Slides (`sizes=100vw`) brauchen zusätzlich eine 2560w-Stufe, sonst skalieren grosse oder High-DPR-Screens die 1600w hoch.
- Joggediballa-Phone-Shots fahren bewusst tiefer (`avif 55 / webp 78`), UI-Screenshots vertragen das.
- `resize` macht Aspect-Crop und Breiten-Skalierung in EINEM `resize()`-Aufruf: sharp beachtet nur das letzte `resize()` einer Pipeline. Zwei Schritte lassen den Crop still unter den Tisch fallen.

### Portrait-Workflow (`profile`)

Das Original liegt wieder vor, alle Varianten sind daraus frisch encodiert. Bei einem neuen Portrait:

1. Datei ablegen unter `content-input/profile/profile-picture.jpg`
2. Ausführen: `node scripts/optimize-assets.mjs profile`
3. Generiert in `public/profile/`:
   - 3× AVIF (480w, 800w, 1200w) @ q=60
   - 3× WebP (480w, 800w, 1200w) @ q=80
   - 2× JPG (800w für `<img>`-Fallback in `Portrait.tsx`, 1200w für JSON-LD `Person.image.contentUrl` und Image-Sitemap) @ q=90 mozjpeg
   - Alle mit EXIF Copyright + Artist
   - Naming: `manuel-heller-portrait-{width}w.{ext}` — Filename trägt das SEO-Keyword für Google Image Search

Ein Lauf des Scripts ersetzt alle acht Varianten in einem Rutsch.

### Was wird wo eingelesen

| Gruppe | Source-Pfad | Output-Dir |
|---|---|---|
| `photography` | `content-input/photography/source/DSC*.jpg` (5 verdrahtete Slides) | `public/photography/` |
| `profile` | `content-input/profile/profile-picture.jpg` | `public/profile/` |
| `portfolio` | `content-input/projects/portfolio/source/homepage-landscape.png`, `homepage-five-themes.png` | `public/projects/portfolio/` |
| `joggediballa` | `content-input/projects/joggediballa/source/*-lightmode-*.png` + `homepage-darkmode-landscape.png` | `public/projects/joggediballa/` |
| `about-tiles` | `content-input/about/tiles/{key}-{landscape,portrait}.jpg` (bzw. `.png`) | `public/about/tiles/` |

Alle Sources liegen unter `content-input/` und sind gitignored — Originale (Fotos, Profilbild) wegen Größe und Privacy, Screenshots wegen Konsistenz und um `public/` rein für Build-Outputs zu halten. Das Script enforced das per Startup-Assertion: findet es ein `source/` oder `_unused/` Verzeichnis irgendwo unter `public/`, bricht es mit einer Fehlermeldung ab.

Nur die `public/`-Outputs werden gecommittet.

---

## Warum gitignored?

- **Größe**: einzelne Fotos sind 10–37 MB. 29 davon × 4 Sprachen × Branches = unhaltbar im Git.
- **Privacy**: Joggediballa-Admin-Screenshots können personenbezogene Daten enthalten. Auch Profilfoto ist semi-privat.
- **Workflow**: optimierte Outputs sind das Artefakt, nicht die Roh-Inputs.

Falls jemand das Repo neu klont und die Site bauen will, braucht er entweder:
1. die Roh-Inputs von Manu (privat geteilt), oder
2. die bereits optimierten `public/`-Files aus dem letzten Commit

Beides ist okay — die Roh-Inputs sind nur für Re-Processing nötig.
