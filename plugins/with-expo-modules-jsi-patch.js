const { withMod, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withExpoModulesJSIPatch(config) {
  return withMod(config, {
    platform: 'ios',
    mod: 'dangerous',
    action: (config) => {
      const root = config.modRequest.projectRoot;
      const jsiDir = path.join(root, 'node_modules', 'expo-modules-jsi', 'apple', 'Sources', 'ExpoModulesJSI');

      if (!fs.existsSync(jsiDir)) {
        console.warn('expo-modules-jsi source not found, skipping patch');
        return config;
      }

      const filesToPatch = [
        'Contexts/HostFunctionContext.swift',
        'Contexts/HostObjectContext.swift',
        'Runtime/JavaScriptPropNameID.swift',
        'Runtime/Values/JavaScriptError.swift',
        'Runtime/Values/JavaScriptValue.swift',
      ];

      for (const file of filesToPatch) {
        const filePath = path.join(jsiDir, file);
        if (!fs.existsSync(filePath)) continue;

        let contents = fs.readFileSync(filePath, 'utf8');

        // Remove Sendable conformance from final/internal class declarations that have weak var runtime.
        contents = contents.replace(/(\s+(?:internal|public)\s+(?:final\s+)?class\s+\w+)(:\s*Sendable)(\s*\{)/g, '$1$3');

        fs.writeFileSync(filePath, contents, 'utf8');
      }

      return config;
    },
  });
};
