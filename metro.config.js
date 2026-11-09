const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname)

// Folders the phone app never imports: the desktop app (with its own
// node_modules), web export output and Android build files. Watching them
// makes Metro's file watcher time out on Windows ("Failed to start watch mode").
const ignored = ["desktop", "dist", "android", ".expo"].map(
  (dir) => new RegExp(`^${__dirname.replace(/[\\/]/g, "[\\\\/]").replace(/[.*+?^${}()|]/g, "\\$&")}[\\\\/]${dir.replace(".", "\\.")}[\\\\/].*`),
);
const existing = config.resolver.blockList;
config.resolver.blockList = [...(Array.isArray(existing) ? existing : existing ? [existing] : []), ...ignored];

module.exports = withNativeWind(config, { input: './global.css' })
