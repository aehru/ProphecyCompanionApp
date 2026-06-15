/**
 * Expo config plugin: pin the CMake version used to build the Android app.
 *
 * Why: on Windows the default SDK CMake (3.22.1, ninja 1.10) hits the 260-char
 * MAX_PATH limit while compiling the codegen C++ for native modules with long
 * names (e.g. react-native-keyboard-controller). CMake >= 3.30 bundles ninja
 * 1.12, which honors the Windows long-path API when LongPathsEnabled=1 is set.
 *
 * This injects `externalNativeBuild { cmake { version ... } }` into the generated
 * android/app/build.gradle's `android { ... }` block, so the fix survives every
 * `expo prebuild`. Devs must have the matching CMake installed:
 *   sdkmanager "cmake;3.31.6"
 *
 * Harmless on macOS/Linux — that CMake version just gets used there too.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const CMAKE_VERSION = '3.31.6';
const GUARD = `version "${CMAKE_VERSION}"`; // presence => already applied

const CMAKE_BLOCK = `    // Pinned by withCmakeVersion plugin: ninja 1.12+ honors Windows long paths,
    // fixing MAX_PATH failures from long codegen filenames. Requires the SDK
    // package: sdkmanager "cmake;${CMAKE_VERSION}".
    externalNativeBuild {
        cmake {
            version "${CMAKE_VERSION}"
        }
    }
`;

function applyCmakeVersion(contents) {
  if (contents.includes(GUARD)) return contents; // idempotent

  // Insert as the first entry inside the top-level `android {` block.
  const next = contents.replace(/android\s*\{\n/, (m) => m + CMAKE_BLOCK);
  if (next === contents) {
    throw new Error(
      '[withCmakeVersion] Could not find `android {` in build.gradle. Update the plugin anchor.',
    );
  }
  return next;
}

module.exports = function withCmakeVersion(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('[withCmakeVersion] Expected android/app/build.gradle to be Groovy.');
    }
    cfg.modResults.contents = applyCmakeVersion(cfg.modResults.contents);
    return cfg;
  });
};
