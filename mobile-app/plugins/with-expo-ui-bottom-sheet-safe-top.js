const fs = require('node:fs/promises');
const path = require('node:path');
const { withDangerousMod } = require('@expo/config-plugins');

const ANDROID_SHEET_SOURCE = 'node_modules/@expo/ui/android/src/main/java/expo/modules/ui/ModalBottomSheetView.kt';
const INSET_DECLARATION = '  val statusBarTopInset = with(LocalDensity.current) { WindowInsets.statusBars.getTop(this).toDp() }';
const MAX_HEIGHT_DECLARATION = '  val availableSheetHeight = LocalConfiguration.current.screenHeightDp.dp - statusBarTopInset';
const TOP_TOUCH_HEIGHT_DECLARATION = '  val expandedTopTouchHeightPx = with(LocalDensity.current) { 72.dp.toPx() }';
const TOP_TOUCH_LISTENER_DECLARATION = [
  '  val topTapTargetView = LocalView.current',
  '  DisposableEffect(topTapTargetView, sheetState, scope, expandedTopTouchHeightPx, ignoreDismissForTopTap) {',
  '    var topTapCandidate = false',
  '    var downX = 0f',
  '    var downY = 0f',
  '    val touchSlop = ViewConfiguration.get(topTapTargetView.context).scaledTouchSlop.toFloat()',
  '    val clearDismissSuppression = Runnable { ignoreDismissForTopTap.set(false) }',
  '    val listener = View.OnTouchListener { view, event ->',
  '      val location = IntArray(2)',
  '      view.getLocationOnScreen(location)',
  '      val localY = event.rawY - location[1]',
  '      when (event.actionMasked) {',
  '        MotionEvent.ACTION_DOWN -> {',
  '          val sheetTop = runCatching { sheetState.requireOffset() }.getOrNull()',
  '          topTapCandidate = sheetTop != null &&',
  '            sheetState.currentValue != SheetValue.Expanded &&',
  '            localY >= sheetTop &&',
  '            localY <= sheetTop + expandedTopTouchHeightPx',
  '          downX = event.rawX',
  '          downY = event.rawY',
  '        }',
  '        MotionEvent.ACTION_MOVE -> {',
  '          if (topTapCandidate && (kotlin.math.abs(event.rawX - downX) > touchSlop || kotlin.math.abs(event.rawY - downY) > touchSlop)) {',
  '            topTapCandidate = false',
  '          }',
  '        }',
  '        MotionEvent.ACTION_UP -> {',
  '          if (topTapCandidate) {',
  '            topTapCandidate = false',
  '            ignoreDismissForTopTap.set(true)',
  '            view.removeCallbacks(clearDismissSuppression)',
  '            view.postDelayed(clearDismissSuppression, 500L)',
  '            scope.launch { if (sheetState.currentValue != SheetValue.Expanded) sheetState.expand() }',
  '          }',
  '        }',
  '        MotionEvent.ACTION_CANCEL -> topTapCandidate = false',
  '      }',
  '      false',
  '    }',
  '    topTapTargetView.setOnTouchListener(listener)',
  '    onDispose {',
  '      topTapTargetView.setOnTouchListener(null)',
  '      topTapTargetView.removeCallbacks(clearDismissSuppression)',
  '    }',
  '  }',
].join('\n');
const TOUCH_LISTENER_ANCHOR = '    ForwardKeyEventsToActivity(appContext.currentActivity)';
const ORIGINAL_MODIFIER = '    modifier = ModifierRegistry.applyModifiers(props.modifiers, appContext, composableScope, globalEventDispatcher)';
const OLD_MODIFIER = `${ORIGINAL_MODIFIER}\n      .padding(top = statusBarTopInset)`;
const MAX_HEIGHT_MODIFIER = `${ORIGINAL_MODIFIER}\n      .heightIn(max = availableSheetHeight)`;
const PREVIOUS_SAFE_MODIFIER = `${MAX_HEIGHT_MODIFIER}\n      .pointerInput(sheetState, expandedTopTouchHeightPx) {\n        awaitEachGesture {\n          val down = awaitFirstDown(requireUnconsumed = false)\n          if (down.position.y <= expandedTopTouchHeightPx) {\n            val up = waitForUpOrCancellation()\n            if (up != null && sheetState.currentValue != SheetValue.Expanded) {\n              scope.launch { sheetState.expand() }\n            }\n          }\n        }\n      }`;

const DRAG_HANDLE_SLOT = [
  '    dragHandle = when {',
  '      dragHandleSlotView != null -> {',
  '        { with(UIComposableScope()) { with(dragHandleSlotView) { Content() } } }',
  '      }',
  '      props.showDragHandle -> {',
  '        { BottomSheetDefaults.DragHandle() }',
  '      }',
  '      else -> null',
  '    },',
].join('\n');
const EXPANDED_DRAG_HANDLE_SLOT = [
  '    dragHandle = when {',
  '      dragHandleSlotView != null -> {',
  '        {',
  '          Box(',
  '            modifier = Modifier.fillMaxWidth().height(48.dp).clickable { scope.launch { sheetState.expand() } },',
  '            contentAlignment = Alignment.Center',
  '          ) {',
  '            with(UIComposableScope()) { with(dragHandleSlotView) { Content() } }',
  '          }',
  '        }',
  '      }',
  '      props.showDragHandle -> {',
  '        {',
  '          Box(',
  '            modifier = Modifier.fillMaxWidth().height(48.dp).clickable { scope.launch { sheetState.expand() } },',
  '            contentAlignment = Alignment.Center',
  '          ) {',
  '            BottomSheetDefaults.DragHandle()',
  '          }',
  '        }',
  '      }',
  '      else -> null',
  '    },',
].join('\n');

const REQUIRED_IMPORTS = [
  'import androidx.core.view.WindowCompat',
  'import androidx.compose.foundation.clickable',
  'import androidx.compose.foundation.layout.Box',
  'import androidx.compose.foundation.layout.WindowInsets',
  'import androidx.compose.foundation.layout.fillMaxWidth',
  'import androidx.compose.foundation.layout.height',
  'import androidx.compose.foundation.layout.heightIn',
  'import androidx.compose.foundation.layout.statusBars',
  'import androidx.compose.material3.BottomSheetDefaults',
  'import androidx.compose.material3.SheetValue',
  'import androidx.compose.ui.Alignment',
  'import androidx.compose.ui.Modifier',
  'import androidx.compose.ui.platform.LocalConfiguration',
  'import androidx.compose.ui.platform.LocalDensity',
  'import androidx.compose.ui.unit.dp',
  'import kotlinx.coroutines.launch',
  'import android.view.MotionEvent',
  'import android.view.View',
  'import android.view.ViewConfiguration',
  'import androidx.compose.runtime.remember',
  'import java.util.concurrent.atomic.AtomicBoolean',
];

module.exports = function withExpoUiBottomSheetSafeTop(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const filePath = path.join(config.modRequest.projectRoot, ANDROID_SHEET_SOURCE);
      let source = await fs.readFile(filePath, 'utf8');

      const importAnchor = 'import androidx.compose.material3.BottomSheetDefaults';
      if (!source.includes(importAnchor) || !source.includes(ORIGINAL_MODIFIER)) {
        throw new Error('The installed @expo/ui Android bottom-sheet source changed; update with-expo-ui-bottom-sheet-safe-top before prebuilding.');
      }

      for (const importLine of REQUIRED_IMPORTS) {
        if (!source.split(/\r?\n/).includes(importLine)) {
          source = source.replace(importAnchor, `${importLine}\n${importAnchor}`);
        }
      }
      for (const oldImport of [
        'import androidx.compose.foundation.gestures.awaitEachGesture\n',
        'import androidx.compose.foundation.gestures.awaitFirstDown\n',
        'import androidx.compose.foundation.gestures.waitForUpOrCancellation\n',
        'import androidx.compose.foundation.layout.requiredWidth\n',
        'import androidx.compose.ui.input.pointer.pointerInput\n',
      ]) {
        source = source.replace(oldImport, '');
      }
      source = source.replace('import androidx.compose.foundation.layout.padding\n', '');
      source = source.replace('Modifier.requiredWidth(LocalConfiguration.current.screenWidthDp.dp).height(48.dp).clickable { scope.launch { sheetState.expand() } }', 'Modifier.fillMaxWidth().height(48.dp).clickable { scope.launch { sheetState.expand() } }');

      if (source.includes(DRAG_HANDLE_SLOT)) {
        source = source.replace(DRAG_HANDLE_SLOT, EXPANDED_DRAG_HANDLE_SLOT);
      } else if (!source.includes('Modifier.fillMaxWidth().height(48.dp).clickable { scope.launch { sheetState.expand() } }')) {
        throw new Error('The installed @expo/ui Android bottom-sheet source changed; could not expand the drag-handle touch target.');
      }

      const dialogAnchor = '  val dialog = (LocalView.current.parent as? DialogWindowProvider)?.window?.callback as? Dialog';
      const windowDeclaration = '  val dialogWindow = (LocalView.current.parent as? DialogWindowProvider)?.window';
      if (!source.includes(dialogAnchor)) {
        throw new Error('The installed @expo/ui Android bottom-sheet source changed; could not find its native dialog window.');
      }
      if (!source.includes(windowDeclaration)) {
        source = source.replace(dialogAnchor, `${dialogAnchor}\n${windowDeclaration}`);
      }

      const effectAnchor = '  DisposableEffect(dialog, activity) {';
      const safeWindowEffect = '  DisposableEffect(dialog, activity, dialogWindow) {\n    dialogWindow?.let { WindowCompat.setDecorFitsSystemWindows(it, true) }';
      if (source.includes(effectAnchor)) {
        source = source.replace(effectAnchor, safeWindowEffect);
      } else if (!source.includes('WindowCompat.setDecorFitsSystemWindows(it, true)')) {
        throw new Error('The installed @expo/ui Android bottom-sheet source changed; could not configure native status-bar insets.');
      }

      const scopeAnchor = '  val scope = rememberCoroutineScope()';
      if (!source.includes(scopeAnchor)) {
        throw new Error('The installed @expo/ui Android bottom-sheet source changed; could not place the status-bar inset.');
      }

      if (!source.includes(INSET_DECLARATION)) {
        source = source.replace(scopeAnchor, `${scopeAnchor}\n${INSET_DECLARATION}`);
      }
      if (!source.includes(MAX_HEIGHT_DECLARATION)) {
        source = source.replace(INSET_DECLARATION, `${INSET_DECLARATION}\n${MAX_HEIGHT_DECLARATION}`);
      }
      if (!source.includes(TOP_TOUCH_HEIGHT_DECLARATION)) {
        source = source.replace(MAX_HEIGHT_DECLARATION, `${MAX_HEIGHT_DECLARATION}\n${TOP_TOUCH_HEIGHT_DECLARATION}`);
      }
      if (!source.includes('val ignoreDismissForTopTap = remember { AtomicBoolean(false) }')) {
        source = source.replace(TOP_TOUCH_HEIGHT_DECLARATION, `${TOP_TOUCH_HEIGHT_DECLARATION}\n  val ignoreDismissForTopTap = remember { AtomicBoolean(false) }`);
      }
      source = source.replace(TOP_TOUCH_LISTENER_DECLARATION, '');
      if (!source.includes('val topTapTargetView = LocalView.current')) {
        if (!source.includes(TOUCH_LISTENER_ANCHOR)) {
          throw new Error('The installed @expo/ui Android bottom-sheet source changed; could not attach the top touch target to its dialog.');
        }
        source = source.replace(TOUCH_LISTENER_ANCHOR, `${TOUCH_LISTENER_ANCHOR}\n${TOP_TOUCH_LISTENER_DECLARATION}`);
      }

      if (source.includes(OLD_MODIFIER)) {
        source = source.replace(OLD_MODIFIER, MAX_HEIGHT_MODIFIER);
      } else if (source.includes(PREVIOUS_SAFE_MODIFIER)) {
        source = source.replace(PREVIOUS_SAFE_MODIFIER, MAX_HEIGHT_MODIFIER);
      } else if (!source.includes('.heightIn(max = availableSheetHeight)')) {
        source = source.replace(ORIGINAL_MODIFIER, MAX_HEIGHT_MODIFIER);
      }

      source = source.replace('onDismissRequest = onDismissRequest,', 'onDismissRequest = { if (!ignoreDismissForTopTap.getAndSet(false)) onDismissRequest() },');

      if (!source.includes('.heightIn(max = availableSheetHeight)')) {
        throw new Error('Could not constrain the expanded Expo UI bottom sheet below the status bar.');
      }

      await fs.writeFile(filePath, source);
      return config;
    },
  ]);
};
