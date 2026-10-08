# DayKindle interface consistency

The shared Evergreen theme follows system light/dark mode. Refined and Expressive retain their fonts and icons. Navigation, planner data structures, and sync consent remain unchanged.

## Implementation

Light amber adds a subtle warm tint to onboarding guidance, template context, weekly reflection, profile guidance, and empty-state icon badges. Shared `warmSurface`/`warmAccent` tokens use cream (`#FAF1DE`) in light mode and muted dark amber (`#29271D`) in dark mode. These decorative accents have their own tokens, separate from warning feedback.

- `src/constants/theme.ts` defines backgrounds, surfaces, primary/inverse text, secondary text, primary/pressed actions, selection, separators, control borders, disabled states, chart colors, overlays, and semantic feedback. Screens use `useTheme` and `useThemedStyles` rather than local palettes. Official Apple controls and Google glyph colors remain separate.
- Text fields retain their original subtle separator borders and individual corner radii, including 17-point entry and routine-title fields. Dark-mode canvas/background tokens use near-black green (`#08110C`); elevated surfaces stay distinct.
- Shared fields provide persistent labels, theme-controlled placeholders, inline errors, forwarded focus refs, and height that scales with system text size. Existing explicit labels suppress duplicate field labels where appropriate.
- Shared buttons have a 44-point minimum height and immediate feedback. Primary actions use green with `onAccent` text. Informational text and missed actions no longer rely on reduced opacity. Shared empty-state and feedback components use the same text and spacing rules.
- Toasts use semantic severity colors and reduced-motion transitions. Save/recovery errors stay visible across routes. Tab selection and checkbox motion respect reduced motion; native gestures remain available.
- Android native backdrop rendering obscured History despite populated accessibility nodes. Android now uses a bounded, theme-colored edge wash. iOS retains native blur and the existing Reduce Transparency fallback.
- Purpose copy now explains Today, goals, templates, check-ins, routines, History, and Progress date ranges and denominators. Profile copy distinguishes local data from cloud sync; it does not advertise remote push delivery as configured.

## Save and recovery behavior

`confirmLocalSave` acknowledges the queued write containing the current edits. Goal/task/habit forms, check-ins, weekly reflections, commitments, reminders, template activation, routine edits, setup, and account sync consent wait for that acknowledgment before reporting a local save or clearing the draft.

Failed primary entry/template writes keep the applied draft pending. Controls stay locked until the same write is retried, avoiding duplicate creations and silently ignored draft changes. Routine and reminder retries reuse stable IDs. Cloud sync status remains independent of local save acknowledgment.

Reminder feedback distinguishes an unsuccessful local save, denied permissions, unsupported notifications, scheduling failure after a local save, and successful scheduling. A failed schedule remains actionable in Profile. Raw service error text is not shown in the account interface.

## Static checks

Run:

```sh
npx tsc --noEmit
npx expo lint --no-cache
npm run test:interface
git diff --check
```

Final results: typecheck passed, all six interface tests passed, and `git diff --check` passed. Lint completed with no errors and one existing `no-empty-object-type` warning in `src/shared/utils/create-compound-component/index.ts`.

The interface test suite covers:

- Text/placeholder, primary, pressed, feedback, and control-border contrast in both modes.
- Real style pairings for selected calendar dates, range controls, template choices, primary buttons, and account actions.
- Persistence acknowledgment waiting for a write, isolating later requests, rejecting failed writes, and succeeding after retry.
- Error and warning feedback retaining separate semantic roles from success.

Normal foreground pairs are checked at 4.5:1; control borders at 3:1. These checks cover the tested semantic pairs and style combinations, rather than certifying every composited native effect or large-text layout.

## Runtime evidence and limits

Representative screenshots were reviewed during implementation:

| Platform | Observed screens | Appearance |
| --- | --- | --- |
| iOS 26.3, iPhone 17 Pro simulator | Today and templates in light mode; Goals, Progress, Profile, and History in dark mode; reading goal setup in light mode | Expressive |
| Android emulator | Today in light mode; Profile and History in dark mode, including the restored History rendering after the backdrop fix | Expressive |

Selected captures are in `interface-verification/`. They are captures from the implementation pass, not an exhaustive final regression suite.

The native computer-use surface timed out, and later navigation/touch checks did not reliably reach their intended screens. Refined runtime rendering, the complete screen × mode × appearance matrix, invalid-form focus/keyboard behavior, repeated native submission, injected storage failure, offline sync/conflict recovery, denied notification permission, large text, VoiceOver/TalkBack, and sheet/gesture alternatives remain unverified on devices. The automated storage-failure test is not a device-level injected failure.

No physical-device testing, new native build, backend deployment, or schema migration was performed for this pass. Existing dirty work was preserved; no staging, commit, or push was performed.
