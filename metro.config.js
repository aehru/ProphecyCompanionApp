// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Allow importing Drizzle's generated .sql migration files.
config.resolver.sourceExts.push('sql');

// Web only: expo-sqlite's worker imports wa-sqlite.wasm as a module. Metro
// ships no `wasm` extension by default, so the import fails to resolve.
config.resolver.assetExts.push('wasm');

module.exports = config;
