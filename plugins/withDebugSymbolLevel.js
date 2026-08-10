/**
 * Expo config plugin: ship a symbol table instead of full DWARF debug info for
 * the release bundle's native libraries.
 *
 * Why: AGP defaults `ndk.debugSymbolLevel` to FULL for a release AAB. Those
 * symbols live in BUNDLE-METADATA/, are stripped by Play before delivery, and
 * never reach a device — but they were ~24 MB of the 96 MB we upload. SYMBOL_TABLE
 * keeps function names, so Play Console still symbolicates native crashes, and
 * drops the DWARF line/type tables nobody reads.
 *
 * Anchored on the `release {` block inside `buildTypes`, NOT the identically
 * named one inside `signingConfigs` (which comes first in the file).
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const SYMBOL_LEVEL = 'SYMBOL_TABLE';
const GUARD = 'debugSymbolLevel'; // presence => already applied

const NDK_BLOCK = `            // Pinned by withDebugSymbolLevel plugin: Play strips native debug symbols
            // before delivery, but AGP's default (FULL) still adds ~24 MB to every
            // uploaded bundle. SYMBOL_TABLE keeps native crash symbolication.
            ndk {
                debugSymbolLevel "${SYMBOL_LEVEL}"
            }
`;

function applyDebugSymbolLevel(contents) {
  if (contents.includes(GUARD)) return contents; // idempotent

  const buildTypesAt = contents.indexOf('buildTypes {');
  if (buildTypesAt === -1) {
    throw new Error(
      '[withDebugSymbolLevel] Could not find `buildTypes {` in build.gradle. Update the plugin anchor.',
    );
  }

  const head = contents.slice(0, buildTypesAt);
  const tail = contents.slice(buildTypesAt);
  const next = tail.replace(/release\s*\{\n/, (m) => m + NDK_BLOCK);
  if (next === tail) {
    throw new Error(
      '[withDebugSymbolLevel] Could not find `release {` inside buildTypes. Update the plugin anchor.',
    );
  }
  return head + next;
}

module.exports = function withDebugSymbolLevel(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('[withDebugSymbolLevel] Expected android/app/build.gradle to be Groovy.');
    }
    cfg.modResults.contents = applyDebugSymbolLevel(cfg.modResults.contents);
    return cfg;
  });
};
