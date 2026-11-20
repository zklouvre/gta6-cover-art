# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/zklouvre/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/zklouvre/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Vice Cover Studio** is a GTA VI-style cover maker: pick from 6 collage layouts, 5 neon grades, and 9 photo treatments per panel, write the title in bold GTA lettering, and export a 1080×1080 PNG. Built for the make.fun "Make GTA 6 Cover Art" bounty.

- 6 layouts: Vice Grid (2×2), Diagonal Split, Hero + Strip, Single Frame, Nine Grid (3×3), Tilted Snaps (3 polaroids)
- 5 grades: Vice City Neon, Sunset Boulevard, Leonida Nights, Noir, Palm Gold
- 9 photo treatments per slot (sunset, duotone, neon, night, gold, noir, comic, halftone, original) plus grain, vignette, and halftone strips
- Per-panel controls: sample photos or your own uploads, zoom, position, treatment — click a panel on the cover to select it
- GTA-style lettering: Anton display title (gradient fill, outline, drop shadow), Pacifico neon-script subtitle, Bebas Neue credits — fonts vendored locally, no network
- Editor: dark premium theme, undo/redo, Shuffle, Reset, live preview
- Export: 1080×1080, 1080×1350, or 1920×1080 PNG, rendered fresh at the chosen size

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Or verify the entry the way the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# out/ holds app/, screenshots/, and dossier.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=ddjvdkr0&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
