/**
 * Patch @novnc/novnc for Electron/esbuild/Vite compatibility.
 *
 * 1. browser.js: Remove top-level await (breaks esbuild CJS bundling)
 * 2. rfb.js: Enable UnixLogon (type 129) + configurable security type filter
 *
 * Run: node scripts/patch-novnc.js
 */

const fs = require('fs');
const path = require('path');

const novncDir = path.join(__dirname, '..', 'node_modules', '@novnc', 'novnc', 'lib');

if (!fs.existsSync(novncDir)) {
  console.log('[patch-novnc] @novnc/novnc not found, skipping.');
  process.exit(0);
}

// --- Patch 1: browser.js — remove top-level await ---
const browserPath = path.join(novncDir, 'util', 'browser.js');
let browserContent = fs.readFileSync(browserPath, 'utf8');

if (browserContent.includes('_h264CheckDone')) {
  console.log('[patch-novnc] browser.js already patched.');
} else {
  const oldLine = 'exports.supportsWebCodecsH264Decode = supportsWebCodecsH264Decode = await _checkWebCodecsH264DecodeSupport();';
  const newCode = `// [PATCHED] Replaced top-level await with async .then() init for esbuild/Vite compatibility
var _h264CheckDone = false;
_checkWebCodecsH264DecodeSupport().then(function(result) {
  _h264CheckDone = true;
  exports.supportsWebCodecsH264Decode = supportsWebCodecsH264Decode = result;
}).catch(function() {
  _h264CheckDone = true;
  exports.supportsWebCodecsH264Decode = supportsWebCodecsH264Decode = false;
});`;

  if (browserContent.includes(oldLine)) {
    browserContent = browserContent.replace(oldLine, newCode);
    fs.writeFileSync(browserPath, browserContent, 'utf8');
    console.log('[patch-novnc] Patched browser.js — removed top-level await.');
  } else {
    console.log('[patch-novnc] WARNING: Could not find top-level await pattern in browser.js.');
  }
}

// --- Patch 2: rfb.js — configurable security types with encryption filter ---
const rfbPath = path.join(novncDir, 'rfb.js');
let rfbContent = fs.readFileSync(rfbPath, 'utf8');

if (rfbContent.includes('_securityFilter')) {
  console.log('[patch-novnc] rfb.js already patched.');
  process.exit(0);
}

// 2a. Add _securityFilter property initialization after _scaleViewport init
const scaleViewportInit = '_this._scaleViewport = false;';
if (rfbContent.includes(scaleViewportInit)) {
  rfbContent = rfbContent.replace(
    scaleViewportInit,
    scaleViewportInit + `
    // [PATCHED] Security filter: 'auto' | 'none' | 'encrypted'
    // 'auto' = accept any type, 'none' = prefer unencrypted, 'encrypted' = prefer encrypted
    _this._securityFilter = 'auto';`
  );
}

// 2b. Add securityFilter getter/setter after scaleViewport property
const scaleViewportSetter = `this._scaleViewport = scale;`;
const afterScaleViewport = rfbContent.indexOf(scaleViewportSetter);
if (afterScaleViewport !== -1) {
  // Find the next "key:" after scaleViewport setter to insert before it
  const insertSearch = rfbContent.indexOf('key: "resizeSession"', afterScaleViewport);
  if (insertSearch !== -1) {
    // Go back to find the start of the property definition block "}, {"
    const blockStart = rfbContent.lastIndexOf('}, {', insertSearch);
    if (blockStart !== -1) {
      const securityFilterProp = `}, {
    key: "securityFilter",
    get: function get() {
      return this._securityFilter;
    },
    set: function set(filter) {
      this._securityFilter = filter;
    }
  `;
      rfbContent = rfbContent.slice(0, blockStart) + securityFilterProp + rfbContent.slice(blockStart);
    }
  }
}

// 2c. Replace _isSupportedSecurityType to respect the filter
const oldIsSupportedFn = `key: "_isSupportedSecurityType",
    value: function _isSupportedSecurityType(type) {
      var clientTypes = [securityTypeNone, securityTypeVNCAuth, securityTypeRA2ne, securityTypeTight, securityTypeVeNCrypt, securityTypeXVP, securityTypeARD, securityTypeMSLogonII, securityTypeUnixLogon, securityTypePlain];
      return clientTypes.includes(type);
    }`;

const newIsSupportedFn = `key: "_isSupportedSecurityType",
    value: function _isSupportedSecurityType(type) {
      // [PATCHED] Configurable security type filter
      var allTypes = [securityTypeNone, securityTypeVNCAuth, securityTypeRA2ne, securityTypeTight, securityTypeVeNCrypt, securityTypeXVP, securityTypeARD, securityTypeMSLogonII, securityTypeUnixLogon, securityTypePlain];
      if (!allTypes.includes(type)) return false;

      // Encrypted types: RA2ne(6), VeNCrypt(19) can provide TLS
      var encryptedTypes = [securityTypeRA2ne, securityTypeVeNCrypt];
      // Plain types: None(1), VNCAuth(2), Tight(16), XVP(22), ARD(30), MSLogonII(113), UnixLogon(129), Plain(256)
      var plainTypes = [securityTypeNone, securityTypeVNCAuth, securityTypeTight, securityTypeXVP, securityTypeARD, securityTypeMSLogonII, securityTypeUnixLogon, securityTypePlain];

      if (this._securityFilter === 'none') {
        return plainTypes.includes(type);
      } else if (this._securityFilter === 'encrypted') {
        return encryptedTypes.includes(type);
      }
      return true; // 'auto' — accept all
    }`;

if (rfbContent.includes(oldIsSupportedFn)) {
  rfbContent = rfbContent.replace(oldIsSupportedFn, newIsSupportedFn);
} else {
  // Try the unpatched version (without UnixLogon)
  const oldOriginal = rfbContent.match(/key: "_isSupportedSecurityType",\s*value: function _isSupportedSecurityType\(type\) \{[^}]+\}/);
  if (oldOriginal) {
    rfbContent = rfbContent.replace(oldOriginal[0], newIsSupportedFn);
  } else {
    console.log('[patch-novnc] WARNING: Could not find _isSupportedSecurityType in rfb.js.');
  }
}

fs.writeFileSync(rfbPath, rfbContent, 'utf8');
console.log('[patch-novnc] Patched rfb.js — added securityFilter property + UnixLogon support.');
