# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/zklouvre/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/zklouvre/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Vice Cover Studio** is a GTA VI-style cover maker: pick from 6 layouts, 5 grades, and 9 photo treatments per panel, write the title in bold GTA lettering, and export a PNG at 1080×1080, 1080×1350, or 1920×1080. Built for the make.fun "Make GTA 6 Cover Art" bounty.

## Features

- 6 layouts: Vice Grid (2×2), Diagonal Split, Hero + Strip, Single Frame, Nine Grid (3×3), Tilted Snaps (3 polaroids)
- 5 grades: Vice City Neon, Sunset Boulevard, Leonida Nights, Noir, Palm Gold
- 9 photo treatments per slot (sunset, duotone, neon, night, gold, noir, comic, halftone, original), an Auto option that follows the grade, plus grain, vignette, and halftone strips
- Per-panel controls: sample photos or your own uploads, zoom, position, treatment — click a panel on the cover to select it
- GTA-style lettering: Anton display title (gradient fill, outline, drop shadow), Pacifico neon-script subtitle on the bright grades (letterspaced Bebas capitals on Noir and Leonida Nights), Bebas Neue credits — fonts vendored locally, no network
- Editor: dark premium theme, undo/redo, Shuffle, Reset, live preview
- Export: 1080×1080, 1080×1350, or 1920×1080 PNG, rendered fresh at the chosen size

## Screenshots

- `screenshots/1-cover.jpg` — finished Diagonal Split cover in Vice City Neon, a 1280×720 render of the 1920×1080 wide export.
- `screenshots/2-editor.jpg` — the editor itself: layout picker, grade picker, and live preview.
- `screenshots/3-cover.jpg` — alternate portrait cover (Nine Grid in Leonida Nights): a 1024×1280 portrait screenshot file — the portrait export it shows is 1080×1350.
- `screenshots/4-cover.jpg` — Tilted Snaps cover in Palm Gold: the square 1080×1080 export, the default social-ready size.

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
