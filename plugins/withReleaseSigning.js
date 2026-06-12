/**
 * Expo config plugin: inject a release signing config into the generated
 * android/app/build.gradle.
 *
 * The Expo/RN template signs `release` with the *debug* keystore. This plugin
 * rewrites it to use a real upload keystore whose path + passwords come from
 * Gradle properties (set in ~/.gradle/gradle.properties, outside the repo):
 *
 *   PROPHECY_UPLOAD_STORE_FILE      absolute path to the .keystore
 *   PROPHECY_UPLOAD_KEY_ALIAS       key alias
 *   PROPHECY_UPLOAD_STORE_PASSWORD  store password
 *   PROPHECY_UPLOAD_KEY_PASSWORD    key password
 *
 * No secrets live in the repo or in the generated native project. On a machine
 * without those properties (CI, a fresh clone) the build falls back to debug
 * signing instead of failing, so `assembleDebug` etc. still work.
 *
 * Runs on every `expo prebuild`, so the config survives native regeneration.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const GUARD = 'PROPHECY_UPLOAD_STORE_FILE'; // presence => already applied

const RELEASE_SIGNING_CONFIG = `        release {
            if (project.hasProperty('PROPHECY_UPLOAD_STORE_FILE')) {
                storeFile file(project.property('PROPHECY_UPLOAD_STORE_FILE'))
                storePassword project.property('PROPHECY_UPLOAD_STORE_PASSWORD')
                keyAlias project.property('PROPHECY_UPLOAD_KEY_ALIAS')
                keyPassword project.property('PROPHECY_UPLOAD_KEY_PASSWORD')
            }
        }
`;

// Used only when the upload keystore properties are present.
const RELEASE_SIGNING_SELECTOR =
  "project.hasProperty('PROPHECY_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug";

function applyReleaseSigning(contents) {
  if (contents.includes(GUARD)) return contents; // idempotent

  // 1. Add a `release` block inside `signingConfigs { ... }` (template only has debug).
  const step1 = contents.replace(/signingConfigs\s*\{\n/, (m) => m + RELEASE_SIGNING_CONFIG);
  if (step1 === contents) {
    throw new Error(
      '[withReleaseSigning] Could not find `signingConfigs {` in build.gradle. Update the plugin anchors.',
    );
  }

  // 2. Point the release buildType at it. Anchor on the template's caution comment
  //    so we don't touch the debug buildType's identical line.
  const step2 = step1.replace(
    /(\/\/ see https:\/\/reactnative\.dev\/docs\/signed-apk-android\.\s*\n\s*signingConfig )signingConfigs\.debug/,
    `$1${RELEASE_SIGNING_SELECTOR}`,
  );
  if (step2 === step1) {
    throw new Error(
      '[withReleaseSigning] Could not repoint the release buildType signingConfig — risk of an unsigned/debug-signed release. Update the plugin anchors.',
    );
  }

  return step2;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('[withReleaseSigning] Expected android/app/build.gradle to be Groovy.');
    }
    cfg.modResults.contents = applyReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
};
