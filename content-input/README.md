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
├─ joggediballa/
│   ├─ joggediballa-story.mdx         ← Original-Story von Manu (Quelle für Case Study)
│   └─ screenshots/                   ← TODO Manu (siehe content-briefing.md §5.4)
│       ├─ home.jpg
│       ├─ events.jpg
│       ├─ team.jpg
│       ├─ shotcounter.jpg
│       ├─ admin-dashboard.jpg
│       ├─ overlay-stream.jpg
│       └─ statistic.jpg
└─ audio/
    └─ playground-loop.mp3            ← lizenzfreier Audio-Loop für Playground B
                                        (Claude sucht oder Manu liefert)
```

---

## Wer legt was hierhin?

### Manu (manuell, einmalig)

- [x] `profile/profile-picture.jpg` — kopiere von `Downloads\portfolio input\Profilfoto\Profilfoto.JPEG`
- [x] `photography/source/*.jpg` — kopiere alle JPEGs aus `Downloads\portfolio input\Example Bilder\`
- [x] `joggediballa/joggediballa-story.mdx` — kopiere von `Downloads\portfolio input\joggediballa-story.mdx`
- [x] `joggediballa/screenshots/*.jpg` — neu erstellen, sobald Joggediballa-Plattform gescreenshotet ist (Liste siehe `docs/content-briefing.md` §5.4)

### Claude (automatisch, beim Implementieren)

- `audio/playground-loop.mp3` — sucht lizenzfreien Loop (CC0 / Public Domain) und legt ihn ab, mit `LICENSE.md` daneben die die Quelle dokumentiert

---

## Build-Pipeline (kommt später)

Phase 9 des Plans (`docs/plan.md`) bringt ein Script `scripts/optimize-assets.ts`, das:

1. Fotos aus `photography/source/` → AVIF (mehrere Sizes) + WebP-Fallback → `public/photos/`
2. Screenshots aus `joggediballa/screenshots/` → optimiertes WebP → `public/projects/joggediballa/`
3. Profilfoto → AVIF + responsive sizes → `public/profile/`
4. Audio → Copy mit File-Hash → `public/audio/`

Nur die `public/`-Outputs werden gecommittet. Die Roh-Inputs hier in `content-input/` bleiben lokal.

---

## Warum gitignored?

- **Größe**: einzelne Fotos sind 10–37 MB. 24 davon × 4 Sprachen × Branches = unhaltbar im Git.
- **Privacy**: Joggediballa-Admin-Screenshots können personenbezogene Daten enthalten. Auch Profilfoto ist semi-privat.
- **Workflow**: optimierte Outputs sind das Artefakt, nicht die Roh-Inputs.

Falls jemand das Repo neu klont und die Site bauen will, braucht er entweder:
1. die Roh-Inputs von Manu (privat geteilt), oder
2. die bereits optimierten `public/`-Files aus dem letzten Commit

Beides ist okay — die Roh-Inputs sind nur für Re-Processing nötig.
