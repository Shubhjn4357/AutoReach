const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Watch the monorepo root to allow resolving shared modules and root node_modules
config.watchFolders = [path.resolve(__dirname, "..")];

// Resolve the custom '../../shared' path mapping used in app/(tabs)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("../../shared/")) {
    const relativePath = moduleName.substring("../../shared/".length);
    const resolvedPath = path.resolve(__dirname, "../shared", relativePath);
    return context.resolveRequest(context, resolvedPath, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
