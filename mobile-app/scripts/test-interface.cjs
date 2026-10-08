const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadSource(relativePath) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)((name) => {
    if (name === 'react-native') return { Platform: { select: (options) => options.ios } };
    if (name === '@/global.css') return {};
    throw new Error(`Unexpected test import ${name}`);
  }, module, module.exports);
  return module.exports;
}
const { Colors } = loadSource('src/constants/theme.ts');
const { LocalSaveConfirmations, confirmSavedWrite } = loadSource('src/features/home/local-save-confirmation.ts');

function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map((v) => parseInt(v, 16) / 255)
    .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
for (const [mode, theme] of Object.entries(Colors)) {
  test(`${mode}: text, controls, and semantic feedback meet contrast requirements`, () => {
    const pairs = [];
    for (const background of ['paper', 'surface', 'lightGreen', 'pressed', 'warmSurface']) {
      for (const foreground of ['ink', 'muted', 'green']) pairs.push([foreground, background, 4.5]);
    }
    pairs.push(['onAccent', 'green', 4.5], ['onAccent', 'actionPressed', 4.5], ['onInk', 'ink', 4.5], ['heroText', 'hero', 4.5], ['heroMuted', 'hero', 4.5]);
    for (const severity of ['error', 'warning', 'success', 'info']) pairs.push([severity, `${severity}Background`, 4.5]);
    pairs.push(['warmAccent', 'warmSurface', 4.5]);
    pairs.push(['controlBorder', 'surface', 3], ['controlBorder', 'paper', 3]);
    for (const [foreground, background, minimum] of pairs) {
      const ratio = contrast(theme[foreground], theme[background]);
      assert.ok(ratio >= minimum, `${mode} ${foreground}/${background}: ${ratio.toFixed(2)} < ${minimum}`);
    }
  });
}

test('save confirmation waits for storage and isolates later requests', async () => {
  const queue = new LocalSaveConfirmations();
  let finished = false;
  const first = queue.request().then(() => { finished = true; });
  const batch = queue.takePending();
  let completeWrite;
  const write = new Promise((resolve) => { completeWrite = resolve; });
  const completion = confirmSavedWrite(write, batch);
  const later = queue.request();
  await Promise.resolve();
  assert.equal(finished, false);
  completeWrite();
  await completion;
  await first;
  assert.equal(finished, true);
  const nextBatch = queue.takePending();
  assert.equal(nextBatch.length, 1);
  await confirmSavedWrite(Promise.resolve(), nextBatch);
  await later;
});

test('failed writes reject confirmation and a retry can succeed', async () => {
  const queue = new LocalSaveConfirmations();
  const failed = assert.rejects(queue.request(), /disk full/);
  await assert.rejects(confirmSavedWrite(Promise.reject(new Error('disk full')), queue.takePending()), /disk full/);
  await failed;
  const retry = queue.request();
  await confirmSavedWrite(Promise.resolve(), queue.takePending());
  await retry;
});

const { feedbackTone } = loadSource('src/components/feedback-tone.ts');
test('feedback severity maps to its own semantic roles', () => {
  for (const theme of Object.values(Colors)) {
    for (const severity of ['info', 'success', 'warning', 'error']) {
      assert.deepEqual(feedbackTone(theme, severity), { color: theme[severity], backgroundColor: theme[`${severity}Background`] });
    }
    assert.notEqual(feedbackTone(theme, 'error').color, feedbackTone(theme, 'success').color);
    assert.notEqual(feedbackTone(theme, 'warning').color, feedbackTone(theme, 'success').color);
  }
});

function styleRoles(relativePath) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const file = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const styles = {};
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'StyleSheet.create' && ts.isObjectLiteralExpression(node.arguments[0])) {
      for (const member of node.arguments[0].properties) {
        if (!ts.isPropertyAssignment(member) || !ts.isObjectLiteralExpression(member.initializer)) continue;
        const values = {};
        for (const property of member.initializer.properties) {
          if (!ts.isPropertyAssignment(property)) continue;
          const expression = property.initializer.getText(file);
          values[property.name.getText(file)] = expression.replace(/^(palette|colors)\./, '');
        }
        styles[member.name.getText(file)] = values;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return styles;
}

test('rendered selected states and primary labels preserve contrast in both modes', () => {
  const cases = [
    ['src/features/home/history-screen.tsx', 'selectedDateText', 'dateButtonSelected'],
    ['src/features/home/history-screen.tsx', 'selectedWeekDateMeta', 'dateButtonSelected'],
    ['src/features/home/home-screen.tsx', 'primaryButtonText', 'primaryButton'],
    ['src/features/home/home-screen.tsx', 'progressRangeTextSelected', 'progressRangeButtonSelected'],
    ['src/features/home/home-screen.tsx', 'profilePrimaryActionText', 'profilePrimaryAction'],
    ['src/app/template-detail.tsx', 'optionTextSelected', 'optionSelected'],
    ['src/app/template-detail.tsx', 'dayChipTextSelected', 'dayChipSelected'],
    ['src/app/day-template-detail.tsx', 'dayChipTextSelected', 'dayChipSelected'],
    ['src/features/account/guest-workspace-sign-in-tray.tsx', 'primaryActionLabel', 'primaryAction'],
  ];
  for (const [file, foreground, background] of cases) {
    const styles = styleRoles(file);
    for (const [mode, theme] of Object.entries(Colors)) {
      const color = theme[styles[foreground]?.color];
      const fill = theme[styles[background]?.backgroundColor];
      assert.ok(color && fill, `Missing semantic pair: ${file} ${foreground}/${background}`);
      const ratio = contrast(color, fill);
      assert.ok(ratio >= 4.5, `${mode} ${file} ${foreground}/${background}: ${ratio.toFixed(2)}`);
    }
  }
});

test('guest sign-in uses the shared Reacticx Tray with a horizontal accessible header', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src/features/account/guest-workspace-sign-in-tray.tsx'), 'utf8');
  assert.match(source, /from '\.\.\/\.\.\/shared\/components\/organisms\/tray'/);
  assert.doesNotMatch(source, /@expo\/ui\/community\/bottom-sheet/);
  assert.match(source, /<Tray\.Content>/);
  assert.match(source, /<Tray\.View id="providers">/);
  assert.match(source, /<Tray\.View id="confirm-name">/);
  assert.match(source, /<Tray\.ScrollView/);

  const styles = styleRoles('src/features/account/guest-workspace-sign-in-tray.tsx');
  assert.equal(styles.headerControl?.width, '44');
  assert.equal(styles.headerControl?.height, '44');
  assert.equal(styles.trayHeader?.flexDirection, "'row'");
});

test('Profile keeps sign-in for guests and sync plus sign-out actions for signed-in users', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src/features/home/home-screen.tsx'), 'utf8');
  const profile = source.slice(source.indexOf("{activeTab === 'profile'"), source.indexOf("{activeTab === 'profile'" ) + 11000);
  assert.match(profile, /account\.user \? <>[\s\S]*?Sync now/);
  assert.match(profile, /accessibilityLabel="Sign out"/);
  assert.match(profile, /\) : <>[\s\S]*?accessibilityLabel="Sign in to sync this guest workspace"[\s\S]*?<PageText style=\{styles\.profilePrimaryActionText\}>Sign in<\/PageText>/);
  assert.doesNotMatch(profile, /account\.configured \? <>[\s\S]*?Sign in<\/PageText>[\s\S]*?: <PageText/);
});

test('the animated squircle splash writes the brand name, lasts at least two seconds, and honors reduced motion', () => {
  const splash = fs.readFileSync(path.join(__dirname, '..', 'src/features/home/animated-splash.tsx'), 'utf8');
  const session = fs.readFileSync(path.join(__dirname, '..', 'src/features/home/home-session.tsx'), 'utf8');

  assert.match(splash, /daykindle-logo\.png/);
  assert.match(splash, /width \* 0\.78, height \* 0\.42, 340/);
  assert.match(splash, /useReducedMotion\(\)/);
  assert.match(splash, /REVEAL_DURATION = 3200/);
  assert.match(splash, /POST_STROKE_FILL_MS = 300/);
  assert.match(splash, /withTiming\(2, \{ duration: POST_STROKE_FILL_MS, easing: Easing\.linear/);
  assert.match(splash, /POST_REVEAL_HOLD_MS = 1550/);
  assert.match(splash, /withDelay\(POST_REVEAL_HOLD_MS, withTiming\(2\.001/);
  assert.match(splash, /reduceMotion \? 180 : REVEAL_DURATION/);
  assert.match(splash, /DayKindle/);
  assert.match(splash, /SquircleSurface style=\{styles\.logoSquircle\} radius=\{logoSize \* 0\.32\}/);
  assert.doesNotMatch(splash, /createLogoMorphPath|logoMorphProgress/);
  assert.match(splash, /Skia\.Path\.MakeFromText\(WORDMARK\[index\]/);
  assert.match(splash, /start=\{0\} end=\{trimProgress\}/);
  assert.match(splash, /WORDMARK\[index\]/);
  assert.match(splash, /useSharedValue\(0\)/);
  assert.match(splash, /LOGO_EXIT_DURATION = 750/);
  assert.match(splash, /const flightProgress = target && !reduceMotion \? Math\.min\(1, transitionProgress\.value\) : 0/);
  assert.match(splash, /translateX: targetTranslateX \* flightProgress/);
  assert.match(splash, /translateY: targetTranslateY \* flightProgress/);
  assert.match(splash, /DESTINATION_FADE_DURATION_MS = 200/);
  assert.match(splash, /REDUCED_MOTION_FADE_DURATION_MS = 100/);
  assert.match(splash, /const revealDelay = hasTarget \? \(reduceMotion \? REDUCED_MOTION_FADE_DURATION_MS : LOGO_EXIT_DURATION\) : 0/);
  assert.match(splash, /if \(hasTarget && !reduceMotion\)/);
  assert.match(splash, /if \(!hasTarget \|\| reduceMotion\)/);
  assert.match(splash, /opacity: revealProgress \* \(1 - exitProgress\)/);
  assert.match(splash, /setTimeout\(revealScreen, revealDelay\)/);
  assert.match(splash, /opacity: 1 - destinationRevealProgress\.value/);
  assert.match(splash, /backdropStyle/);
  assert.match(splash, /accessible=\{false\}/);
  assert.match(splash, /importantForAccessibility="no-hide-descendants"/);
  assert.match(splash, /pointerEvents="auto"/);
  assert.doesNotMatch(splash, /withRepeat\(/);

  assert.match(session, /SplashTargetContext\.Provider value=\{splashTargetReporter\}/);
  assert.match(session, /SplashStatusTransitionContext\.Provider value=\{splashScreenRevealing\}/);
  assert.match(session, /splashTargetDecision === 'pending'/);
  assert.match(session, /setTimeout\(reportNoSplashTarget, 250\)/);
  assert.match(session, /splashTargetDecisionRef\.current !== 'pending'/);
  assert.match(session, /readyToTransition=\{splashTransitionReady\}/);
  assert.match(session, /target=\{splashTarget\}/);
  assert.match(session, /onScreenRevealStart=\{onSplashScreenRevealStart\}/);
  assert.match(session, /onTransitionComplete=\{onSplashTransitionComplete\}/);

  const firstScreen = fs.readFileSync(path.join(__dirname, '..', 'src/app/index.tsx'), 'utf8');
  assert.match(firstScreen, /reportTarget: reportSplashTarget, reportNoTarget: reportNoSplashTarget/);
  assert.match(firstScreen, /if \(!canFlySplashLogo\) reportNoSplashTarget\(\)/);
  assert.match(firstScreen, /canFlySplashLogo = showingWelcome/);
  assert.match(firstScreen, /measureInWindow/);
  assert.match(firstScreen, /DAYKINDLE_LOGO/);
  assert.match(firstScreen, /<SquircleSurface style=\{styles\.sunLogoSquircle\} radius=\{30\}/);
  assert.doesNotMatch(firstScreen, /<AppIcon name="sun" size=\{64\}/);
  const layout = fs.readFileSync(path.join(__dirname, '..', 'src/app/_layout.tsx'), 'utf8');
  assert.match(layout, /splashTransitionReady \? 'dark-content' : 'light-content'/);
  const tabsLayout = fs.readFileSync(path.join(__dirname, '..', 'src/app/(tabs)/_layout.tsx'), 'utf8');
  assert.match(tabsLayout, /reportNoTarget\(\)/);
});

test('shared card surfaces use a ten-percent squircle corner depth', () => {
  const surface = fs.readFileSync(path.join(__dirname, '..', 'src/components/squircle-surface.tsx'), 'utf8');
  const cards = fs.readFileSync(path.join(__dirname, '..', 'src/components/squircle-card.tsx'), 'utf8');

  assert.match(surface, /CARD_SQUIRCLE_RADIUS_RATIO = 0\.1/);
  assert.match(surface, /Math\.min\(width, height\) \* CARD_SQUIRCLE_RADIUS_RATIO/);
  assert.match(cards, /squircleRadiusForSize\(size\.width, size\.height\)/);
});
