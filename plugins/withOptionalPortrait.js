/**
 * Expo config plugin: declare `android.hardware.screen.portrait` NOT required.
 *
 * Why: ML Kit's invisible delegate activities (GmsBarcodeScanningDelegateActivity,
 * GmsDocumentScanningDelegateActivity — pulled in by expo-camera / the image
 * cropper) are locked `screenOrientation="portrait"` in their library manifest.
 * Google Play infers an IMPLIED required `screen.portrait` feature from any
 * portrait-locked activity, which filters out devices without a portrait screen
 * (some tablets, Chromebooks/desktop, Android XR). Our own activity is
 * `unspecified`; an explicit `required="false"` overrides the inference.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const FEATURE = 'android.hardware.screen.portrait';

module.exports = function withOptionalPortrait(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const features = (manifest['uses-feature'] ??= []);
    const existing = features.find((f) => f.$['android:name'] === FEATURE);
    if (existing) existing.$['android:required'] = 'false';
    else features.push({ $: { 'android:name': FEATURE, 'android:required': 'false' } });
    return cfg;
  });
};
