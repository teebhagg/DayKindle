# DayKindle App Store header and search creatives

## Goal and approved copy

Rebuild the DayKindle header and search assets with larger, readable app screens. The header contains three supplied iPhone captures; each search asset contains one larger capture.

- Header: `Plan today.` in Inter Medium, followed by the single Caveat Bold emphasis phrase `Adjust as life changes.`
- Search: `Choose a goal.` in Inter Medium, followed by the single Caveat Bold emphasis phrase `Find your next step.`

This copy reflects current planning and goal-template features. It makes no outcome or behavior-change promises.

## Source captures and fonts

Use each complete, transparent iPhone capture without cropping, redrawing, recoloring, or retouching any phone or app UI:

1. `/Users/mac/Documents/Projects/Accountability-Tracker/marketing/public/mockups/templates-expressive.png`
2. `/Users/mac/Documents/Projects/Accountability-Tracker/marketing/public/mockups/today-expressive-recommendation.png`
3. `/Users/mac/Documents/Projects/Accountability-Tracker/marketing/public/mockups/progress-expressive.png`
4. `/Users/mac/Documents/Projects/Accountability-Tracker/marketing/public/mockups/goal-template-expressive.png`

Use Inter 24pt Medium from `/Users/mac/Documents/Projects/Accountability-Tracker/mobile-app/node_modules/expo-dev-menu/android/src/debug/res/font/inter_medium.ttf`. Inter's font license is OFL-1.1, published in the [official Inter repository](https://github.com/rsms/inter/blob/master/LICENSE.txt); do not treat the Expo package's MIT license as the font license. Use the Caveat variable font at `/private/tmp/daykindle-caveat-variable.ttf`, setting its weight axis to Bold. Caveat's font and OFL-1.1 license are published in the [official Caveat repository](https://github.com/googlefonts/caveat).

## Header layout

Use a confident, full-height triptych. Put the headline and script phrase in a left copy column; arrange the three phones in order (Templates, Today, Progress) across the remaining width. In the 5244 × 2950 export, make each screen at least 68% of the canvas height; in the 3840 × 1646 export, make each screen at least 78% of the canvas height. Use a small overlap between transparent device silhouettes only where it does not cover any screen content, and tilt each phone 10 degrees in alternating directions. Keep all screen pixels and the entire device silhouette inside the canvas. The 5244 × 2950 canvas is 16:9; the more compact 3840 × 1646 canvas is 2.33:1. Both use the same left-copy/right-triptych structure with phones sized to fit.

Exports and flat background colors:

- `header-triptych-5244x2950.png` — `#F7F8F5`
- `header-triptych-3840x1646.png` — `#1E3829`

## Search layout

Use a left copy column and one large phone on the right, showing the Goal Template capture. The complete screen must occupy at least 75% of the canvas height and remain visible. Use the same composition for both aspect ratios; scale the phone down proportionally to fit the wide 16:9 canvas. The 1920 × 1280 image is a proportional downscale of the 3840 × 2560 image.

Exports and flat background colors:

- `search-goal-5244x2950.png` — `#E4EEE5`
- `search-goal-3840x2560.png` — `#FAF1DE`
- `search-goal-1920x1280.png` — `#FAF1DE`

## Visual treatment

- Use one flat palette color per image with no gradient, texture, or vignette.
- Set headlines in Inter Medium, 60–84 pt at the 1920 × 1280 reference canvas scale (1 pt = 1.333 px at that scale), scaling proportionally for each export. Use `#24332D` on light backgrounds and `#F7F8F5` on deep forest.
- Set exactly one emphasis phrase per image in Caveat Bold at 115–130% of the headline size, with a slight −3° to +5° rotation. Use `#356348` on light backgrounds and `#FAF1DE` on deep forest.
- Give phone mockups warm, soft shadows. Add sparse hand-drawn squiggles, stars, and curved arrows in `#356348`, `#79551E`, or `#FAF1DE`, chosen for contrast.
- Place the lowercase `daykindle` wordmark in a corner.

## Deliverables and checks

Save the five PNGs in `/Users/mac/.codex/visualizations/2026/10/09/01a12179-2c09-7bb3-b39e-f39841a5ffb4/daykindle-hand-drawn-editorial/creative-assets-v2/`. Also create `creative-contact-sheet.png` and `daykindle-header-search-creatives-v2.zip` in that directory. The ZIP contains the five PNGs and contact sheet.

Check exact pixel dimensions, palette colors, opacity, and flat backgrounds. Inspect each full-size export and the phone screens at native pixels; confirm all supplied screen content remains visible and readable, with no screen pixels obscured by another phone or decoration. Create a local safe-area guide preview using the dimensions in `/Users/mac/.agents/skills/app-store-screenshots/SKILL.md`: universal art safe area x=1921–3323, y=660–1622; 3840 × 1646 header art safe area x=1097–2743, y=493–1154; 3840 × 2560 search art safe area x=836–3004, y=765–1795. Prioritize the larger phones over fitting the estimated guides: any phone may extend outside its safe-area rectangle, while remaining fully inside the exported canvas. Include the guides in the local review preview so the user can see where Apple may crop the phone. Apple's universal crop guides are estimates; the user must check App Store Connect Preview after upload. Do not upload or submit these assets.
