const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const { VitePlugin } = require('@electron-forge/plugin-vite');
const path = require('path');
const fs = require('fs');

// External native/Node modules that Vite does NOT bundle
const externalPackages = [
  'ssh2',
  'cpu-features',
  '@lydell/node-pty',
  '@electerm/rdpjs',
  'ws',
  'node-forge',
  'bufferutil',
  'utf-8-validate',
];

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

module.exports = {
  packagerConfig: {
    asar: false,
    extraResource: ['./data'],
    ignore: (file) => {
      if (!file) return false;
      // Keep .vite build output, node_modules, and package.json
      return !(
        file.startsWith('/.vite') ||
        file.startsWith('/node_modules') ||
        file.startsWith('/package.json')
      );
    },
  },
  rebuildConfig: {},
  hooks: {
    packageAfterCopy: async (_forgeConfig, buildPath) => {
      const projectRoot = path.resolve(__dirname);
      const srcNodeModules = path.join(projectRoot, 'node_modules');
      const destNodeModules = path.join(buildPath, 'node_modules');

      for (const pkg of externalPackages) {
        const src = path.join(srcNodeModules, pkg);
        const dest = path.join(destNodeModules, pkg);
        if (fs.existsSync(src)) {
          copyDirSync(src, dest);
          console.log(`  Copied: ${pkg}`);

          // Also copy transitive native dependencies
          const pkgJson = path.join(src, 'package.json');
          if (fs.existsSync(pkgJson)) {
            const deps = JSON.parse(fs.readFileSync(pkgJson, 'utf8')).dependencies || {};
            for (const dep of Object.keys(deps)) {
              const depSrc = path.join(srcNodeModules, dep);
              const depDest = path.join(destNodeModules, dep);
              if (fs.existsSync(depSrc) && !fs.existsSync(depDest)) {
                copyDirSync(depSrc, depDest);
                console.log(`  Copied (transitive): ${dep}`);
              }
            }
          }
        } else {
          console.warn(`  Warning: ${pkg} not found in node_modules`);
        }
      }
    },
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux'],
    },
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'electron/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'electron/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};
