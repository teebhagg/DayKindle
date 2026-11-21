# Test coverage

**Reviewed:** 2026-10-27  
**Method:** Source inventory plus static checks, interface tests, boundary probes, a host-SQLite persistence stress harness, and a web export. Temporary test data stayed in memory or `/private/tmp`; no source, dependency, schema, or configuration files were changed. No coverage report was present.

## Automated tests found

| Area | Current harness | What it checks |
| --- | --- | --- |
| Mobile interface contracts | `mobile-app/scripts/test-interface.cjs`, invoked by `npm run test:interface` from `mobile-app/` | Theme contrast pairs, local-save acknowledgement queue behavior, semantic feedback colors, selected UI style pairs, guest sign-in tray/profile source contracts, splash/reduced-motion source invariants, and squircle geometry. The script declares 10 `node:test` cases. |

The test file reads/transpiles source modules and checks selected rendered-style declarations and source patterns. It is useful for those contracts but is not a substitute for rendering or interaction tests on a simulator/device.

## Verification run on 2026-10-27

| Check | Result | Evidence and limits |
| --- | --- | --- |
| `npm run test:interface` | **Failed: 7 passed, 3 failed.** | One contrast assertion reads `home-screen.tsx` although the relevant styles are created in `home-screen-styles.ts`; the actual `onAccent`/`green` pair is covered by a passing theme-level contrast case. The splash test expects `opacity: revealProgress * (1 - exitProgress)` while `animated-splash.tsx` currently uses `opacity: 1 - exitProgress`. The squircle contract expects a `0.1` ratio and `squircleRadiusForSize(size.width, size.height)`; current source defines `0.14` and computes the measured radius inline. These are verified test/source mismatches; intended values and rendered impact need validation. |
| `npm run lint` | **Passed.** | Expo lint completed with exit code 0. |
| `npx tsc --noEmit` | **Passed.** | TypeScript completed with exit code 0. |
| `ai-routine-import.ts` boundary probe | **Passed with a validation edge.** | The parser accepted exactly 24,000 JavaScript string code units and 16 blocks; rejected 24,001 code units, 17 blocks, invalid/empty weekdays, empty blocks, zero targets, and targets without units. It handled braces inside quoted JSON strings. One hundred maximum-size parses took 8.2 ms on this host. This was an ad hoc probe, not a checked-in test. |
| Routine parser malformed/deep-input probe | **Completed; coercion behavior found.** | Ten thousand malformed strings produced no uncaught exceptions. A 18,059-code-unit JSON object with a 9,000-level nested ignored array parsed successfully. A 23,981-code-unit title containing 11,970 emoji (47,921 UTF-8 bytes) was accepted, confirming the cap is based on JavaScript UTF-16 code units rather than encoded bytes. `targetValue: true` was accepted as `1`, and the numeric string `"0x10"` as `16`, because the parser calls `Number()` before validation. The intended input type is numeric; whether numeric strings are supported needs a product decision. |
| `home-storage.ts` host-SQLite stress probe | **Passed.** | Executed the current storage module against Node SQLite 3.53.4 in memory: 129,015 records / 17,106,263 input bytes wrote in 1,039.7 ms and read in 279.3 ms. A duplicate key was rejected and the preceding snapshot remained intact; recovery-snapshot round-trip also passed. This adapter-based host measurement is not a native-device benchmark. |
| Expo web export | **Passed.** | `npx expo export --platform web --output-dir /private/tmp/daykindle-web-scale-export` generated 17 static routes. The main JavaScript entry is 13,234,362 bytes raw / 2,594,275 bytes gzip. |
| Web browser route smoke | **Failed.** | 13 routes and 16 viewport cases (320, 375, 768, 1440 px) returned HTTP 200 with no reported horizontal overflow. The run recorded 48 JavaScript exceptions across 29 navigations; the root, home, goals, history, profile, and progress pages rendered no visible text in the isolated run. `/goals` reported `PathBuilder` and `Typeface` undefined. External requests were deliberately blocked, so resource-loading effects need a second isolated run with local CanvasKit assets. `mobile-app/src` has no `LoadSkiaWeb` call; installed Skia web source reads `global.CanvasKit`, making missing web initialization a strong inference, not a proven sole cause. Skia imports found in app source include `animated-splash.tsx`, `squircle-surface.tsx`, `welcome-auth-screen.tsx`, `skia-collapsing-header-surface.tsx`, `animated-checkbox.tsx`, and `intro-skia-blob.tsx`. |
| Native runtime attempt | **Incomplete.** | A disposable iPhone 17 Pro simulator booted. The installed binary was an Expo development client; it launched to the dev-server picker. Metro started from the current checkout, but opening the deep link stopped at the OS “Open in DayKindle?” confirmation. No Simulator window was available through CUA, so no JS app screen or planner flow was exercised. The disposable simulator was deleted; the existing simulator profile was not interacted with. `adb devices` reported no Android devices, and no APK/AAB was present in the mobile app checkout. |

The boundary and SQLite probes were run as temporary scripts; their results are evidence for the current checkout only. They do not add persistent automated regression coverage.

## Gaps visible from the repository inventory

- No dedicated test suites were found for marketing routes, dashboard queries/auth, Supabase SQL/RLS, or Edge Functions.
- No automated end-to-end, browser, or device suite was found in the checked-in app files.
- No coverage instrumentation or coverage report was found.
- Core business rules such as recurrence, occurrence status transitions, migration normalization, entity sync conflicts/tombstones/cursors, local backup recovery, and notification scheduling have no separately discovered test files.
- The root requirements documents define more behavior than the current test suite asserts.

## Recommended order

1. Resolve the three source/test contract mismatches, directly test contrast against `home-screen-styles.ts`, and decide whether routine targets accept numeric strings. Add parser cases for booleans, numeric strings, Unicode size, deep nesting, and malformed input.
2. Resolve or confirm Skia web initialization, then repeat hydration, interaction, and responsive-route checks with CanvasKit/WASM served locally and external requests blocked.
3. Add pure business-rule tests for recurrence/materialization, occurrence transitions, goal progress, and schema migration normalization. Add persistence cases for backup restore, unreadable data, failed writes, and duplicate-key rollback.
4. Test sync idempotency, page cursors, tombstones, offline behavior, conflict choice, and cross-user RLS with a controlled Supabase environment.
5. Run onboarding, create/complete, check-in, local save/reload, recovery, reminders, and large-history flows in disposable iOS and Android profiles. Add web flows separately.
6. Add dashboard authorization/aggregation tests and accessibility checks without production credentials; profile representative data sizes on supported devices before setting performance budgets.

A script existing in the repository is not evidence that it passed in a given change. Keep device, OS/build, dataset size, exact command, and outcome with future test runs.
