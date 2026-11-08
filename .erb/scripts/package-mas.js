/* eslint-disable no-console */
// The Mac App Store package: a universal, sandboxed Vision20 signed for the
// store, as release/build/Vision20-<version>-mas.pkg.
//
//   MAS_PROFILE=<Mac App Store .provisionprofile> MAS_BUILD=<build number> \
//     npm run package:mas
//
// electron-builder only packages it (unsigned): its universal + mas signing
// signs with the Developer ID and the DMG's entitlements. Then, here:
// - one copy of the app: Agora's libraries are universal already, so the
//   arm64 and x64 asars are the same; the arm64 one becomes app.asar (the
//   Info.plist integrity hash follows) and the x64 copy goes;
// - ElectronTeamID (Electron's sandboxed helpers need the app group);
// - signed for the store (Apple Distribution + the profile), then a pkg
//   signed with the Mac Installer certificate.
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const asar = require('@electron/asar');
const { signAsync } = require('@electron/osx-sign');

const TEAM = '665S2M698Q';
const APP_ID = 'com.vision20.app';
const APP_IDENTITY = `Apple Distribution: Duc Duong (${TEAM})`;
const INSTALLER_IDENTITY = `3rd Party Mac Developer Installer: Duc Duong (${TEAM})`;

const root = path.join(__dirname, '../..');
const profile = process.env.MAS_PROFILE;
const build = process.env.MAS_BUILD;
if (!profile || !fs.existsSync(profile) || !build) {
  console.error('Set MAS_PROFILE (the .provisionprofile) and MAS_BUILD.');
  process.exit(1);
}
const { version } = require(path.join(root, 'release/app/package.json'));
const app = path.join(root, 'release/build/mas-universal/Vision20.app');
const resources = path.join(app, 'Contents/Resources');
const plist = path.join(app, 'Contents/Info.plist');
const pkg = path.join(root, `release/build/Vision20-${version}-mas.pkg`);

const run = (cmd, args) =>
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit' });
const plistBuddy = (command) =>
  execFileSync('/usr/libexec/PlistBuddy', ['-c', command, plist]);

const packageUnsigned = () => {
  fs.rmSync(path.join(root, 'release/build'), { recursive: true, force: true });
  run('npx', [
    'electron-builder',
    'build',
    '--mac',
    'mas',
    '--universal',
    '--publish',
    'never',
    `-c.appId=${APP_ID}`,
    `-c.buildVersion=${build}`,
    '-c.mac.identity=null',
  ]);
};

const keepOneAsar = () => {
  const arm = path.join(resources, 'app-arm64.asar');
  if (!fs.existsSync(arm)) return; // electron-builder merged them itself
  fs.rmSync(path.join(resources, 'app.asar'));
  fs.renameSync(arm, path.join(resources, 'app.asar'));
  fs.renameSync(`${arm}.unpacked`, path.join(resources, 'app.asar.unpacked'));
  fs.rmSync(path.join(resources, 'app-x64.asar'));
  fs.rmSync(path.join(resources, 'app-x64.asar.unpacked'), {
    recursive: true,
  });
  const hash = crypto
    .createHash('sha256')
    .update(asar.getRawHeader(path.join(resources, 'app.asar')).headerString)
    .digest('hex');
  plistBuddy(`Set :ElectronAsarIntegrity:Resources/app.asar:hash ${hash}`);
  plistBuddy('Delete :ElectronAsarIntegrity:Resources/app-arm64.asar');
  plistBuddy('Delete :ElectronAsarIntegrity:Resources/app-x64.asar');
};

const addTeamId = () => {
  try {
    plistBuddy(`Add :ElectronTeamID string ${TEAM}`);
  } catch {
    plistBuddy(`Set :ElectronTeamID ${TEAM}`);
  }
};

const sign = () =>
  signAsync({
    app,
    platform: 'mas',
    type: 'distribution',
    identity: APP_IDENTITY,
    provisioningProfile: profile,
    preAutoEntitlements: false,
    optionsForFile: (file) => ({
      hardenedRuntime: false,
      entitlements: path.join(
        root,
        file === app
          ? 'assets/entitlements.mas.plist'
          : 'assets/entitlements.mas.inherit.plist',
      ),
    }),
  });

(async () => {
  packageUnsigned();
  keepOneAsar();
  addTeamId();
  await sign();
  run('codesign', ['--verify', '--deep', '--strict', app]);
  run('productbuild', [
    '--component',
    app,
    '/Applications',
    '--sign',
    INSTALLER_IDENTITY,
    pkg,
  ]);
  console.log(`\n${pkg}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
