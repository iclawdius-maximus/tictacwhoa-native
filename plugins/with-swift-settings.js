const { withXcodeProject, withPodfile } = require('@expo/config-plugins');

module.exports = function withSwiftSettings(config) {
  config = withPodfile(config, (config) => {
    const podfile = config.modResults.contents;

    const settings = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
        config.build_settings['SWIFT_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
      end
    end
`;

    if (!podfile.includes("SWIFT_STRICT_CONCURRENCY")) {
      config.modResults.contents = podfile.replace(
        /(post_install do \|installer\|[\s\S]*?react_native_post_install\([\s\S]*?\)\n)(  end)/,
        `$1${settings}$2`
      );
    }

    return config;
  });

  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();

    for (const key in configurations) {
      const buildSettings = configurations[key].buildSettings;
      if (buildSettings) {
        buildSettings.SWIFT_STRICT_CONCURRENCY = 'minimal';
        buildSettings.SWIFT_TREAT_WARNINGS_AS_ERRORS = 'NO';
      }
    }

    return config;
  });

  return config;
};
