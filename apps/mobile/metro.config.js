// Expo Metro config for a pnpm monorepo: watch the repo root and resolve
// both the app's and the root's node_modules so workspace packages
// (@jrst/api-client, @jrst/types) resolve and get transpiled.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// pnpm stores packages under .pnpm; pin common Expo deps for Metro.
config.resolver.extraNodeModules = {
  '@expo/vector-icons': path.resolve(projectRoot, 'node_modules/@expo/vector-icons'),
  'expo-font': path.resolve(projectRoot, 'node_modules/expo-font'),
  'expo-linear-gradient': path.resolve(projectRoot, 'node_modules/expo-linear-gradient'),
  'react-native-safe-area-context': path.resolve(
    projectRoot,
    'node_modules/react-native-safe-area-context',
  ),
};

module.exports = config;
