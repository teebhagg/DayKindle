const fs = require('node:fs/promises');
const path = require('node:path');
const { withDangerousMod } = require('@expo/config-plugins');

const ADAPTIVE_ICON_XML_FILES = ['ic_launcher.xml', 'ic_launcher_round.xml'];
const FOREGROUND_REFERENCE = '@drawable/ic_launcher_foreground_safe_zone';
const EXPECTED_FOREGROUND = /<foreground\s+android:drawable="@mipmap\/ic_launcher_foreground"\s*\/>/;

const SAFE_ZONE_DRAWABLE = `<?xml version="1.0" encoding="utf-8"?>
<inset xmlns:android="http://schemas.android.com/apk/res/android"
    android:drawable="@mipmap/ic_launcher_foreground"
    android:insetLeft="20dp"
    android:insetTop="20dp"
    android:insetRight="20dp"
    android:insetBottom="20dp" />
`;

function withDayKindleAndroidIconSafeZone(config) {
  return withDangerousMod(config, ['android', async (config) => {
    const resourcesDirectory = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
    const adaptiveIconDirectory = path.join(resourcesDirectory, 'mipmap-anydpi-v26');
    const drawableDirectory = path.join(resourcesDirectory, 'drawable');

    await fs.mkdir(drawableDirectory, { recursive: true });
    await fs.writeFile(path.join(drawableDirectory, 'ic_launcher_foreground_safe_zone.xml'), SAFE_ZONE_DRAWABLE, 'utf8');

    for (const filename of ADAPTIVE_ICON_XML_FILES) {
      const iconPath = path.join(adaptiveIconDirectory, filename);
      const contents = await fs.readFile(iconPath, 'utf8');
      if (contents.includes(FOREGROUND_REFERENCE)) continue;
      if (!EXPECTED_FOREGROUND.test(contents)) {
        throw new Error(`Could not safely inset Android launcher foreground in ${filename}.`);
      }
      await fs.writeFile(iconPath, contents.replace(EXPECTED_FOREGROUND, `<foreground android:drawable="${FOREGROUND_REFERENCE}"/>`), 'utf8');
    }

    return config;
  }]);
}

module.exports = withDayKindleAndroidIconSafeZone;
