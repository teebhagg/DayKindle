---
title: "Progressive Blur Across Mobile Screens"
date: 2026-10-04
research_mode: standard
query: "How should the Accountability Tracker apply the linked progressive-blur treatment consistently across relevant iOS and Android screens?"
---

# Progressive Blur Across Mobile Screens

## Executive Summary

The Reddit reference is a demonstration of a progressive-blur feature added to expo-backdrop, not a complete screen-design reference. The app should therefore reproduce the edge treatment and its scrolling behavior while preserving its existing visual language and navigation. The recommended architecture is one reusable overlay placed beside the scroll surface it belongs to, with a horizontal wrapper for overflowing rails. This matches the package’s one-edge-at-a-time API and avoids a global overlay guessing which nested scroll view is active [1][2][5].

The package describes a blur that strengthens at a selected edge, fades across the overlay, appears as content passes under that edge, and temporarily uses a tint gradient while the associated scroll view moves quickly. Its documentation also requires touch passthrough and a native development build; web is unsupported by the package itself [2]. The app’s installed package is expo-backdrop 0.1.1 and the project uses Expo SDK 57 / React Native 0.86. Public package metadata declares wildcard peer dependencies but its development dependencies target Expo 56 / React Native 0.85.3. That does not prove incompatibility, but it leaves SDK 57 support undocumented; native-build verification remains necessary [3][4][16].

Platform parity should mean matching edge placement, fade direction, scroll response, and interaction behavior. It should not promise pixel-identical blur, because iOS uses UIKit visual effects while Android has its own rendering path and hardware limits [2][9][12][13][16]. Keep overlays non-interactive, scope them to their owning scroll views, preserve the native iOS tab bar blur, and use a surface-colored fallback. Apple’s Reduce Transparency setting and text contrast need explicit review; an opaque surface fade is the appropriate fallback when blur is reduced [7][10][11][15].

The existing working tree already contains the shared edge component and most route integrations. The remaining engineering decision is whether coverage and accessibility behavior match this design, followed by native iOS and Android rendering checks. The Reddit clip and static source review alone cannot prove that the installed package renders correctly on every device.

## Introduction

This review covers the user’s request for progressive-blur parity on every relevant screen in the Accountability Tracker mobile app. It examines the linked Reddit post, expo-backdrop’s public API and installed 0.1.1 source, versioned Expo and React Native documentation, and current Apple and Android platform guidance. It focuses on screen-edge overlays, horizontally scrolling rails, native platform differences, touch handling, accessibility, and verification requirements.

The project snapshot inspected for this report uses Expo SDK 57, React Native 0.86, expo-backdrop 0.1.1, and react-native-svg. The working tree already contains ProgressiveEdgeBlur and ProgressiveHorizontalScrollView, plus screen integrations and a design/implementation plan. Those files are treated as the user’s current work; the report recommends auditing and completing that scope rather than replacing it [4][5][6][16].

The source reference’s title and text describe “Progressive Blur (Android & iOS)” and say the feature was added to expo-backdrop; the post links the repository and includes an Android preview [1]. It does not provide a full app layout, a screen inventory, accessibility requirements, or a promise of pixel equivalence. This report therefore treats the post as evidence for the edge-blur interaction only.

The scope is limited to current scrollable app routes and horizontal rails: onboarding; Today, Goals, Progress, Profile, and the standalone Home route; Templates and its nested rails/sheets; full-day templates; and template detail routes. It preserves navigation and content. The design values already recorded in the project spec—72 dp top edges, 24 dp side edges, 88 dp eligible bottom edges, and intensities 64 / 52 / 64—are project choices, not values prescribed by the Reddit post or package documentation.

## Main Analysis

### Finding 1: The reference specifies a reusable edge effect, not an app-wide reskin

The Reddit post identifies the contribution as adding ProgressiveBlur to expo-backdrop and provides an Android preview [1]. The repository documentation defines ProgressiveBlurView as blurring content behind the overlay while fading from one chosen edge toward the opposite edge. Its edge property selects top, bottom, left, or right; startOffset can keep the effect at full strength near the chosen edge before it fades [2]. The package does not define new typography, card styling, page layouts, navigation, or content.

This distinction resolves the main design ambiguity. Applying the reference “to every relevant screen” means consistent edge behavior at places where scrollable content meets screen chrome, not replacing all screens with the appearance of the app in the demonstration. The current product’s warm, calm visual language and existing control hierarchy should remain intact. Blurring card backgrounds or turning every panel into glass would go beyond the evidence in the reference and risk reducing legibility [1][2][8].

The package’s API naturally supports one shared edge component. Each instance has a single strongest edge, so vertical screen boundaries and horizontal rail boundaries should be represented by separately placed overlays. The installed project already contains a shared ProgressiveEdgeBlur and a ProgressiveHorizontalScrollView, which is consistent with this model [2][16]. Keeping the overlay near its owner makes the intended scroll target understandable to future maintainers and lets nested sheets and rails remain explicit.

The design should describe behavioral parity rather than screenshot identity. The useful observable properties are where the fade appears, which edge is strongest, when it becomes visible, how it responds while scrolling, and whether controls remain operable. A full visual reskin is neither required nor supported by the supplied reference.

### Finding 2: Each overlay must belong to the nearest relevant scroll surface

ProgressiveBlurView documents that it finds a scroll view behind itself, fades in as content passes under its edge, and can show a gradient instead of blur while that scroll view moves quickly. It also requires pointerEvents set to none so underlying controls continue to receive touches [2]. React Native defines none as making a View never become the target of touch events; box-none is suitable for a wrapper whose children still contain controls [5].

Those behaviors favor explicit per-scroll placement. The top edge should sit beside the vertical scroller it covers. Side fades should sit within the clipped viewport of each horizontal rail. A bottom fade should be present only where fixed or floating controls actually overlap scrollable content. A single navigator-level overlay could be visually simpler, but nested scroll views complicate which content the native component detects. The package documentation does not promise correct targeting for every arbitrary nesting arrangement, so an app-level global overlay would create avoidable ambiguity [2][6].

The current project inventory maps well to this boundary rule. Onboarding uses a fixed step footer, so it is eligible for a bottom fade. Android’s Today, Goals, Progress, Profile, and standalone Home screens use a floating tab bar, also eligible while visible. iOS already uses a native tab bar with system material blur; an app-level duplicate would double the effect. Templates uses a vertical list and horizontal category/schedule rails, with independent scroll views inside sheets. Detail routes need a top treatment but no bottom treatment unless they later add an anchored overlay [16].

The correct implementation pattern is therefore a shared edge component plus a wrapper for horizontal rails, with each instance adjacent to the scroll view it serves. This keeps route-level ownership explicit and permits missing or duplicated overlays to be identified by reviewing the route inventory. The package’s automatic scroll association is helpful, but it is not a reason to move all overlays to one global layer.

### Finding 3: Cross-platform parity is functional, not pixel-identical

The package lists iOS 13+ and Android support for ProgressiveBlurView and says a development build is required; Expo Go is unsupported. It does not support web, so the project’s separate SVG gradient fallback is a necessary platform-specific adaptation [2]. Expo’s SDK reference maps SDK 57 to React Native 0.86, which matches the project manifest [4].

The package’s public package metadata uses wildcard Expo, React, and React Native peer dependencies, while its development dependencies use Expo 56 and React Native 0.85.3 [3]. The installed project resolves version 0.1.1 [16]. This metadata does not establish that SDK 57 is unsupported, nor does it establish that it is tested. The appropriate conclusion is narrower: compatibility with this project’s exact SDK/RN pair remains an empirical question and should be confirmed in native development builds.

Native rendering paths differ. UIKit’s UIVisualEffectView is a system visual-effect surface and Apple warns that applying partial alpha to it or its superviews can produce incorrect effects or extra offscreen rendering [9]. Android added RenderEffect at API 31, and Android documentation cautions that graphics-effect support and performance vary with device processing power [12][13]. expo-backdrop includes platform-specific native source, but those separate paths do not establish that the same numeric intensity yields the same pixels on all hardware [2][16].

Acceptance should compare edge placement, fade shape and direction, scroll coverage, fast-scroll fallback, and touch behavior on both platforms. Intensity may need platform-specific tuning if real devices show a material difference. The application should not claim identical rendering based only on the same prop values. It should also keep a safe solid or gradient treatment available when native blur cannot render.

### Finding 4: Scroll fallback and touch passthrough are part of the effect

The package’s scrollFallback option switches to a plain gradient while the detected scroll view moves quickly, then returns to blur as movement slows. fallbackColor supplies the gradient color. The component also fades in only when content is under the edge [2]. These are core interaction behaviors from the reference’s package, not decorative polish that can be omitted while claiming parity.

The edge overlays are purely decorative. Setting pointerEvents to none ensures an overlay cannot consume a tap or drag, while React Native’s View API documents the exact target behavior [2][5]. This matters on the Templates category rail, schedule rail, and Home editor selectors because an overlay positioned above the rail must not prevent chip taps or horizontal gestures. Screen-reader traversal should likewise skip the decoration while preserving focus on the actual buttons and inputs [5][7].

Short content is a meaningful boundary case. If a screen’s content does not scroll beneath a boundary, a permanent opaque band would conflict with the intended progressive treatment. The package documentation says it fades in as content passes underneath; the installed source also measures content coverage against the selected edge [2][16]. The implementation should preserve that behavior rather than render a fixed tinted bar.

Android’s native graphics guidance emphasizes limiting work in frequently redrawn code and notes that graphics support can vary by hardware [12][14]. The package’s fast-scroll fallback is therefore a sensible behavior to retain and inspect. It reduces the time spent showing the live blur during a fast fling, but neither the documentation nor this review provides a benchmark for this app. Runtime smoothness must be checked on representative hardware before performance is claimed.

### Finding 5: Legibility and system accessibility settings need explicit treatment

Apple’s Human Interface Guidelines describe scroll-edge effects as a way to blur and reduce the opacity of background content to improve legibility [8]. Apple also exposes a Reduce Transparency setting; its accessibility guidance says that the setting reduces blur effects on certain backgrounds and recommends adapting custom elements to system accessibility preferences [10][11]. React Native AccessibilityInfo includes an iOS query for Reduce Transparency and a Reduce Motion query [7].

The project should use an opaque, surface-colored fade when Reduce Transparency is enabled, while retaining the normal progressive blur otherwise. This is a design inference from Apple’s guidance, not a guarantee that expo-backdrop automatically adapts the custom masked overlay. The fallback should keep the same edge and coverage behavior so users do not lose content separation when blur is reduced. On Android, text remains subject to contrast requirements: Google recommends at least 4.5:1 for ordinary text and 3:1 for larger text [15].

No new animated decoration is needed. The package’s effect changes as scroll speed changes, but the screen treatment should not add unrelated movement. Existing Reduce Motion behavior should remain unchanged and be included in visual review. Decorative views should not be exposed as controls to assistive technology [5][7].

Apple also documents a composition constraint: alpha below 1 on UIVisualEffectView or a containing view may cause offscreen rendering and can make some effects look wrong or disappear [9]. The package’s iOS implementation uses a UIKit visual effect inside a masked container and varies container opacity for edge coverage [16]. This is a specific reason to verify the effect on iOS rather than assume static API presence proves correct rendering. The design should preserve the package’s intended fade while confirming that the installed native version remains legible and stable.

## Synthesis & Insights

Three layers of parity matter. First is coverage: every current scroll surface gets exactly the edge treatment it needs. Second is behavior: the fade appears only when content approaches or passes the edge, fades during fast scrolling, and never blocks touch. Third is rendering: both platforms produce a legible effect with an appropriate fallback. The first two can be specified exactly; the third must be calibrated against native devices because UIKit and Android rendering paths differ [2][5][9][12][13].

The existing design’s use of explicit bottom-fade eligibility is an important restraint. Applying a bottom edge everywhere would make every route look uniform at the cost of putting an unnecessary strip over content. Use it only behind the onboarding footer and Android floating tab bar. Preserve iOS NativeTabs’ existing material blur. For horizontal rails, fade the viewport edges, not the selectable cards or pills.

The source review supports the shared per-scroll overlay architecture already present in the working tree. It also highlights two acceptance items that source-only review cannot settle: SDK 57 native compatibility for expo-backdrop 0.1.1, and iOS behavior when the view hierarchy animates opacity around a UIKit visual effect. Those should remain explicit limitations until native builds are inspected.

The route matrix below translates those principles into ownership rules. “Top” means the edge of that route’s vertical scroll viewport. For a nested sheet, the sheet scroll view owns its top edge and the effect must stay clipped within the sheet. “Side” applies to an individual horizontal rail only when its content exceeds the visible width. “Bottom” is limited to a visible anchored overlay; the native iOS tab bar already owns its own system material treatment [2][16].

| Surface | Top edge | Side edges | Bottom edge |
| --- | --- | --- | --- |
| Intro and onboarding | Screen scroll viewport | None in current inventory | Behind fixed step footer |
| Android Today, Goals, Progress, Profile | Screen scroll viewport | Life Areas rail when it overflows | Behind floating tab bar |
| iOS Today, Goals, Progress, Profile | Screen scroll viewport | Life Areas rail when it overflows | No app overlay; native tab material remains |
| Standalone `/home` | Screen scroll viewport | Life Areas rail when it overflows | Behind floating tab bar on both platforms |
| Templates list | Main list viewport | Category rail and schedule cards when they overflow | None |
| Templates preview and edit sheets | Each sheet scroll viewport | None in current sheet content | None |
| Home Add/Edit sheet | No vertical scroller currently | Each overflowing horizontal picker | None |
| Full-day and template detail routes | Route scroll viewport | None in current inventory | None |

This map prevents three common scope mistakes: putting a global overlay over nested scroll surfaces, adding a second app blur to iOS NativeTabs, and treating every bottom edge as eligible without checking whether a control overlays content. It is a source inventory for the current project snapshot; any new route or scroller discovered during implementation should be added before its effect is wired [16].

## Limitations & Caveats

The Reddit post is brief and does not specify complete screens, native version support, accessibility behavior, or performance measurements [1]. The public expo-backdrop README is maintainer documentation and may not document every limitation of the exact 0.1.1 package currently installed [2][3][16]. The project’s manifest and lockfile establish its local versions but do not replace a build [16].

The automated citation checker verified the 15 external bibliography URLs. It marks source [16] as unverified because that entry intentionally refers to local workspace files and has no public URL; those files were inspected directly. The URL check therefore covers the published documentation but cannot independently reproduce the local source snapshot [16].

This research did not run a native build, simulator, emulator, or physical-device inspection. Consequently it makes no claim that the effect currently renders correctly on this project’s SDK 57 setup, handles every nested sheet, or meets contrast requirements on all content. It also does not benchmark frame time or battery usage. Android API guidance applies to platform graphics effects generally; it does not independently certify expo-backdrop’s implementation [12][13][14].

The 72 / 24 / 88 dp dimensions and 64 / 52 / 64 intensity values are existing project design decisions. They should be tuned only if visual inspection shows a concrete mismatch, not presented as values from the linked reference.

## Recommendations

Continue with per-scroll edge ownership using the existing shared ProgressiveEdgeBlur and ProgressiveHorizontalScrollView. Apply top treatment to each vertical scrolling route, side treatment to each overflowing horizontal rail, and bottom treatment only behind anchored content. Keep native iOS tab blur unchanged and preserve a web gradient fallback.

Keep pointerEvents set to none on every decorative edge overlay. Retain the fast-scroll gradient fallback and surface color wash. Add an opaque surface-colored fallback when iOS Reduce Transparency is enabled; check that overlay text and controls remain legible against the darkest and busiest content beneath them [2][5][7][10][15].

Before describing the treatment as complete, use development builds for the project’s exact Expo 57 / React Native 0.86 / expo-backdrop 0.1.1 versions. Review the current route inventory on iOS and Android, including nested sheets and rails, short content, high-velocity scroll, both app visual styles, and reduced-transparency settings. Compare behavioral parity and readability rather than demanding identical blur pixels [2][4][9][12][16].

For each viewport, inspect three states: content resting against the edge, content moving beneath it at ordinary speed, and content moving quickly enough to trigger the gradient fallback. Repeat at both ends of horizontal rails and at the top and bottom of vertical content. The first and last items must remain tappable, sheet effects must stop at the sheet boundary, and short content must not leave a stationary tinted band. Capture the same states on iOS and Android so a difference in native blur is not mistaken for missing coverage. Record device and OS versions when tuning intensity, because those values are not standardized by the reference post or by the cross-platform API [1][2][9][12][13].

## Claims-Evidence Table

| Claim | Evidence and source cluster | Assessment |
| --- | --- | --- |
| C1. The selected reference is about a progressive edge effect, not a full app redesign. | The post names the progressive-blur feature and shows its Android behavior [1]; the package documents edge direction and scroll behavior [2]; the local route inventory supplies the app-specific boundary [16]. | Supported. The post and API describe effect behavior, while the app-specific coverage comes from local code. |
| C2. Each decorative edge belongs to the nearest scroll viewport, passes touches through, and retains fast-scroll fallback. | Maintainer documentation defines automatic scroll association, `scrollFallback`, and passthrough [2]; React Native View and ScrollView APIs define touch targeting and scrolling [5][6]; local nested rails and sheets show why ownership must be explicit [16]. | Supported as implementation guidance. The exact route placement is design synthesis. |
| C3. Functional parity is a reasonable target, but pixel identity and SDK 57 compatibility are not established. | Expo documents the SDK 57 / React Native 0.86 pairing [4]; package metadata shows the published peer range and development dependency versions [3]; UIKit and Android docs describe distinct native rendering constraints [9][12][13]; the installed package and project versions are confirmed locally [16]. | Partially supported. The documentation gap is not evidence of incompatibility. |
| C4. The effect needs an accessibility fallback and readable contrast. | Apple documents Reduce Transparency and custom accessibility adaptation [10][11]; React Native exposes the preference API [7]; Android publishes text contrast guidance [15]. | Inference. The opaque surface fade is the recommended app response, not an automatic package feature. |
| C5. Native appearance and performance need device verification. | UIKit documents alpha/compositing caveats [9]; Android documents effects and device-sensitive performance [12][13][14]; the package metadata does not certify the project’s exact native pairing [3][16]. | Supported. This report did not perform a native build or device inspection. |

The table separates direct documentation from project-specific synthesis. It also identifies where a claim has a practical evidence gap: no public source establishes that one numeric intensity creates the same blur on iOS and Android, and no native build was performed in this research pass [3][9][12][13][16].

## Counterevidence Register

The evidence supports per-scroll ownership, but it does not support a promise of identical pixels across platforms. UIKit uses its visual-effect view system; Android effect rendering and performance depend on APIs and hardware. Therefore, “parity” should be acceptance-tested as matching placement, edge direction, response to scrolling, legibility, and touch behavior. Intensity values may need platform calibration after the effect is viewed on real native builds [9][12][13][14].

The package’s broad wildcard peer dependencies might appear to imply compatibility with the project’s Expo SDK 57 and React Native 0.86 versions. However, the same metadata lists development dependencies targeting Expo 56 and React Native 0.85.3. This is a documentation/testing gap, not proof of failure; only a native build on the project’s exact dependency set can settle it [3][4][16].

The linked post’s Android preview could be read as support for copying a full-screen visual treatment. Its text and repository link instead identify the change as a progressive-blur feature in expo-backdrop, and the package exposes individual edge overlays rather than a screen redesign system. The stronger evidence supports reproducing the edge behavior while keeping the app’s existing layout and visual tokens [1][2].

Finally, a surface-colored fallback improves predictability when blur is reduced or cannot be used, but opacity can still obscure content if an overlay is permanently visible. The fade must be constrained to a viewport where content can pass beneath the edge, use the owning surface token, and remain hidden for rails that fit without scrolling. The effect should be assessed on short content and at scroll endpoints as well as during motion [2][8][16].

## Bibliography

[1] BumblebeeWorth3758 (2026). “Progressive Blur (Android & iOS).” Reddit, r/reactnative. https://www.reddit.com/r/reactnative/comments/1wncbg9/progressive_blur_android_ios/ (Retrieved: 2026-10-04).

[2] Ritesh (2026). “expo-backdrop README.” GitHub. https://github.com/rit3zh/expo-backdrop/blob/main/README.md (Retrieved: 2026-10-04).

[3] Ritesh (2026). “expo-backdrop package metadata.” GitHub. https://github.com/rit3zh/expo-backdrop/blob/main/package.json (Retrieved: 2026-10-04).

[4] Expo (2026). “Expo SDK reference.” Expo Documentation, version 57. https://docs.expo.dev/versions/v57.0.0/ (Retrieved: 2026-10-04).

[5] Meta / React Native contributors (2026). “View.” React Native Documentation, version 0.86. https://reactnative.dev/docs/0.86/view (Retrieved: 2026-10-04).

[6] Meta / React Native contributors (2026). “ScrollView.” React Native Documentation, version 0.86. https://reactnative.dev/docs/0.86/scrollview (Retrieved: 2026-10-04).

[7] Meta / React Native contributors (2026). “AccessibilityInfo.” React Native Documentation, version 0.86. https://reactnative.dev/docs/0.86/accessibilityinfo (Retrieved: 2026-10-04).

[8] Apple (2026). “Materials.” Human Interface Guidelines. https://developer.apple.com/design/human-interface-guidelines/materials (Retrieved: 2026-10-04).

[9] Apple (2026). “UIVisualEffectView.” UIKit Documentation. https://developer.apple.com/documentation/uikit/uivisualeffectview (Retrieved: 2026-10-04).

[10] Apple (2026). “Testing system accessibility features in your app.” Accessibility Documentation. https://developer.apple.com/documentation/accessibility/testing-system-accessibility-features-in-your-app (Retrieved: 2026-10-04).

[11] Apple (2026). “isReduceTransparencyEnabled.” UIKit Documentation. https://developer.apple.com/documentation/uikit/uiaccessibility/isreducetransparencyenabled (Retrieved: 2026-10-04).

[12] Android Developers (2026). “Create a custom drawing: Apply graphics effects.” Android Views Documentation. https://developer.android.com/develop/ui/views/layout/custom-views/custom-drawing (Retrieved: 2026-10-04).

[13] Android Developers (2026). “RenderEffect.” Android API Reference. https://developer.android.com/reference/android/graphics/RenderEffect (Retrieved: 2026-10-04).

[14] Android Developers (2026). “Optimize a custom view.” Android Views Documentation. https://developer.android.com/develop/ui/views/layout/custom-views/optimizing-view (Retrieved: 2026-10-04).

[15] Android Developers (2026). “Make apps more accessible.” Android Accessibility Documentation. https://developer.android.com/guide/topics/ui/accessibility/apps (Retrieved: 2026-10-04).

[16] Accountability Tracker workspace (2026). “Installed expo-backdrop 0.1.1 and app route implementation.” Local package sources and project manifest: mobile-app/node_modules/expo-backdrop, mobile-app/package.json, mobile-app/package-lock.json, and src/components/progressive-edge-blur.tsx. Inspected: 2026-10-04.

## Methodology Appendix

This standard-mode research framed the question as a cross-platform interaction-design and implementation review. Retrieval used the specific Reddit reference, maintainer documentation and package metadata, versioned Expo and React Native documentation, and Apple and Android primary platform documentation. The local project was inspected to confirm its SDK and library versions, existing edge components, screen routes, and horizontal scroll usage.

Claims were grouped into reference scope, scroll ownership and touch behavior, native platform constraints, and accessibility. Direct API behavior was supported with maintainer or platform sources. Recommendations about route ownership, accessibility fallback, and acceptance criteria are explicitly presented as design synthesis. The research did not run code, builds, tests, or device checks.
