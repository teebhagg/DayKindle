# DayKindle

Routines woven into everyday life.

Mobile application built with Expo, React Native, and TypeScript.

## Run locally

```bash
npm install
npx expo start
```

Use the Expo CLI prompts to launch the app on a simulator, device, or web browser.

Native backdrop blur requires a development build; Expo Go is not supported. After installing dependencies, generate the native projects and run a development build:

```bash
npx expo prebuild
npx expo run:ios
# or
npx expo run:android
```

The onboarding header and sticky bottom actions use progressive blur so scrolling content passes beneath them on iOS and Android. Web uses an opaque fallback because `expo-backdrop` does not support web.

## Current flow

The intro is followed immediately by account choice. Google, Apple on iOS, and Guest continue to three short setup screens: life areas with one optional matching goal, visual style, and an optional weekday or weekend routine. Skip opens a clean Guest workspace; a previous local session is kept in a recoverable archive.

## Supabase setup

1. Copy `.env.example` to `.env.local` and add the Supabase project URL and publishable key. Do not put a service-role key in the app.
2. From the repository root, link the `supabase/` project with `npx supabase link --project-ref <project-ref>` and apply its migrations with `npx supabase db push`.
3. Enable Google and Apple in Supabase Auth. Add `dayweave://auth/callback` to the project's redirect allow list for development builds. Keep `daymark://auth/callback` during the transition for already-installed builds. Add the Supabase Auth callback URL to the Google provider configuration. Configure Apple with the iOS bundle ID `com.daykindle.app`.
4. Deploy the `delete-account` Edge Function. It verifies the caller and uses the server-side `SUPABASE_SERVICE_ROLE_KEY`; never add that secret to Expo environment variables.
5. Add the required Apple and Google provider credentials in Supabase Dashboard before testing live sign-in. Web sign-in is not enabled.

Signed-in users are asked once whether their planner may sync. Guest data remains local unless the user signs in and accepts. Sync stores the full planner snapshot, including check-ins and reflections; revision conflicts preserve both copies and offer device and account recovery from Profile.
