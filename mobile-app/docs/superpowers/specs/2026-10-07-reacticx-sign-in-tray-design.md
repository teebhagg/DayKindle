# Reacticx Tray for guest sign-in

## Summary

Replace the `@expo/ui` community BottomSheet currently used by the guest sign-in and account-name confirmation flow with the Reacticx Tray component already copied into `src/shared/components/organisms/tray/`. Keep the change scoped to this flow. The user should see one consistent, animated tray on iOS and Android, with the existing account behavior and DayKindle visual style.

## User action

The user opens sign-in from Profile, chooses Google or Apple, confirms the account name, and explicitly chooses whether to enable sync or keep planner data on this device. The tray can be dismissed with its close control, backdrop, or drag gesture. The existing provider selection and name-confirmation state transition remain intact.

## Design direction

- Preserve DayKindle's light surfaces, green accent, semantic theme colors, and selected visual-style typography.
- Use the copied Reacticx Tray implementation, rather than the native `@expo/ui/community/bottom-sheet` component.
- Keep the tray's handle, rounded panel, dimmed backdrop, and spring/drag interaction supplied by Reacticx.
- Use the same spacing and control sizes on both platforms. Keep icon-only actions at least 44 points high.

## Layout

- Present the tray from the bottom with a content-sized initial height; allow it to grow to a larger detent if needed.
- Use a single horizontal header row: a back control on the left when confirming a name, title/subtitle in the center, and close control on the right. The provider-selection view keeps the left slot balanced.
- Keep the body scrollable and preserve the current input, consent explanation, and explicit sync/keep-local actions.
- Place form actions after the explanatory copy. Ensure the scroll view and keyboard behavior keep the active field and actions reachable on short screens and at larger text sizes.
- Apply the app palette to the Tray surface, border, handle, and backdrop. Avoid the Tray's generic default palette where it conflicts with the app theme.

## Interaction and states

- Closed: no tray content is mounted or interactive.
- Provider selection: Google and iOS Apple provider actions retain their current loading, disabled, configuration-unavailable, and authentication-error states.
- Name confirmation: back returns to provider selection; close dismisses; an empty name shows the existing inline validation; submitting either consent choice preserves the existing save and feedback behavior.
- Motion: use Reacticx's spring presentation and drag behavior. Respect reduced-motion behavior already implemented by the component.
- Keyboard: the name input remains visible and scrollable when the software keyboard is shown. Tapping the action buttons continues to work while the keyboard is present.

## Scope and compatibility

- Replace only `GuestWorkspaceSignInTray`; do not migrate unrelated app sheets.
- Preserve OAuth, local persistence, sync-consent semantics, and user-visible copy unless small layout changes require no copy change.
- Reuse the existing local Tray source and installed Reanimated, Gesture Handler, and Worklets dependencies. Do not install another tray package or refresh copied source as part of this change.
- Support iOS and Android. The implementation must remain in the shared React Native flow.

## Validation

- TypeScript and lint checks.
- Interface tests or targeted tests for open/close, view switching, explicit sync choices, and empty-name validation where the current test harness supports them.
- Inspect the tray on iOS and Android at normal and enlarged text sizes, including the keyboard-open state, short viewport, backdrop dismissal, and drag dismissal.
- Report device/runtime verification separately from static checks.

## Out of scope

- Replacing other native bottom sheets in the app.
- Changing authentication providers, sync behavior, persistence, or onboarding semantics.
- Redesigning the Profile screen behind the tray.
