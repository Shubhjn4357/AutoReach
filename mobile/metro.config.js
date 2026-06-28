const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// --- 1. Monorepo & Custom Path Resolution ---

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

// Add WebAssembly and SQL asset support to the resolver
config.resolver.assetExts.push("wasm", "sql");

// Add COEP and COOP headers to support SharedArrayBuffer on the web
// (Safely ensure config.server exists first)
if (!config.server) {
  config.server = {};
}

config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    middleware(req, res, next);
  };
};
config.transformer.minifierConfig = {
  compress: {
    // The option below removes all console logs statements in production.
    drop_console: ["log", "info", "warn"],
  },
};

module.exports = config;
