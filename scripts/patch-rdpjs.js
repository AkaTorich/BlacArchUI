/**
 * Patch @electerm/rdpjs to fix BoringSSL KEY_USAGE_BIT_INCORRECT error in Electron.
 *
 * Replaces Node.js TLS (BoringSSL) with node-forge pure JS TLS in BufferLayer.startTLS().
 * Also adds getPeerCertificate() support for NLA authentication.
 *
 * Run: node scripts/patch-rdpjs.js
 */

const fs = require('fs');
const path = require('path');

const layerPath = path.join(
  __dirname, '..', 'node_modules', '@electerm', 'rdpjs', 'rdp', 'core', 'layer.js'
);

if (!fs.existsSync(layerPath)) {
  console.log('[patch-rdpjs] @electerm/rdpjs not found, skipping.');
  process.exit(0);
}

let content = fs.readFileSync(layerPath, 'utf8');

if (content.includes('forge.tls.createConnection')) {
  console.log('[patch-rdpjs] Already patched.');
  process.exit(0);
}

// Add node-forge require
if (!content.includes("require('node-forge')")) {
  content = content.replace(
    "var events = require('events');",
    "var events = require('events');\nvar forge = require('node-forge');"
  );
}

// Replace startTLS
const oldStartTLS = /BufferLayer\.prototype\.startTLS = function\(callback\) \{[\s\S]*?^\};/m;

const newStartTLS = `BufferLayer.prototype.startTLS = function(callback) {
\tvar self = this;
\tvar callbackCalled = false;
\tvar serverCert = null;

\tvar tlsConn = forge.tls.createConnection({
\t\tserver: false,
\t\tverify: function(connection, verified, depth, certs) {
\t\t\tif (depth === 0 && certs && certs.length > 0) {
\t\t\t\tserverCert = certs[0];
\t\t\t}
\t\t\treturn true;
\t\t},
\t\tconnected: function(connection) {
\t\t\tif (!callbackCalled) {
\t\t\t\tcallbackCalled = true;
\t\t\t\tcallback();
\t\t\t}
\t\t},
\t\ttlsDataReady: function(connection) {
\t\t\tvar bytes = connection.tlsData.getBytes();
\t\t\tif (bytes.length > 0) {
\t\t\t\tself.socket.write(Buffer.from(bytes, 'binary'));
\t\t\t}
\t\t},
\t\tdataReady: function(connection) {
\t\t\tvar bytes = connection.data.getBytes();
\t\t\tif (bytes.length > 0) {
\t\t\t\tvar buf = Buffer.from(bytes, 'binary');
\t\t\t\ttry {
\t\t\t\t\tself.recv(buf);
\t\t\t\t} catch (e) {
\t\t\t\t\tself.socket.destroy();
\t\t\t\t\tself.emit('error', e);
\t\t\t\t}
\t\t\t}
\t\t},
\t\terror: function(connection, error) {
\t\t\tvar err = new Error('TLS: ' + (error.message || error));
\t\t\tif (!callbackCalled) {
\t\t\t\tcallbackCalled = true;
\t\t\t}
\t\t\tself.emit('error', err);
\t\t},
\t\tclosed: function() {
\t\t\tself.emit('close');
\t\t}
\t});

\tself.secureSocket = {
\t\twrite: function(buffer) {
\t\t\ttry {
\t\t\t\ttlsConn.prepare(buffer.toString('binary'));
\t\t\t} catch (e) {
\t\t\t\tself.emit('error', e);
\t\t\t}
\t\t},
\t\tgetPeerCertificate: function() {
\t\t\tif (!serverCert) return {};
\t\t\ttry {
\t\t\t\tvar pubKeyAsn1 = forge.pki.publicKeyToAsn1(serverCert.publicKey);
\t\t\t\tvar pubKeyDer = forge.asn1.toDer(pubKeyAsn1);
\t\t\t\tvar pubKeyBuffer = Buffer.from(pubKeyDer.getBytes(), 'binary');
\t\t\t\treturn {
\t\t\t\t\tpubkey: pubKeyBuffer,
\t\t\t\t\traw: Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(serverCert)).getBytes(), 'binary')
\t\t\t\t};
\t\t\t} catch (e) {
\t\t\t\treturn {};
\t\t\t}
\t\t}
\t};

\tself.socket.removeAllListeners('data');
\tself.socket.on('data', function(data) {
\t\ttry {
\t\t\ttlsConn.process(data.toString('binary'));
\t\t} catch (e) {
\t\t\tself.socket.destroy();
\t\t\tself.emit('error', e);
\t\t}
\t});

\ttlsConn.handshake();
};`;

if (oldStartTLS.test(content)) {
  content = content.replace(oldStartTLS, newStartTLS);
  fs.writeFileSync(layerPath, content, 'utf8');
  console.log('[patch-rdpjs] Patched layer.js — node-forge TLS (bypasses BoringSSL).');
} else if (!content.includes('forge.tls.createConnection')) {
  console.log('[patch-rdpjs] Could not find startTLS pattern. Manual patch may be needed.');
  process.exit(1);
} else {
  console.log('[patch-rdpjs] layer.js already patched.');
}

// --- Patch rdp.js: add explicit `decompressed` flag to bitmap events ---
const rdpPath = path.join(
  __dirname, '..', 'node_modules', '@electerm', 'rdpjs', 'rdp', 'protocol', 'rdp.js'
);

if (fs.existsSync(rdpPath)) {
  let rdpContent = fs.readFileSync(rdpPath, 'utf8');

  if (rdpContent.includes('decompressed: decompressed')) {
    console.log('[patch-rdpjs] rdp.js already patched.');
  } else {
    // Replace the bitmap event emission block to add decompressed flag
    const oldBitmapBlock = /(\s*)var bitmapData = bitmaps\[bitmap\]\.obj\.bitmapDataStream\.value;\s*var isCompress = bitmaps\[bitmap\]\.obj\.flags\.value & pdu\.data\.BitmapFlag\.BITMAP_COMPRESSION;\s*if \(isCompress && config\.decompress\) \{\s*bitmapData = decompress\(bitmaps\[bitmap\]\.obj\);\s*isCompress = false;\s*\}\s*self\.emit\('bitmap', \{/;

    const newBitmapBlock = `$1var bitmapData = bitmaps[bitmap].obj.bitmapDataStream.value;
            var isCompress = bitmaps[bitmap].obj.flags.value & pdu.data.BitmapFlag.BITMAP_COMPRESSION;
            var decompressed = false;

            if (isCompress && config.decompress) {
                bitmapData = decompress(bitmaps[bitmap].obj);
                isCompress = false;
                decompressed = true;
            }

            self.emit('bitmap', {`;

    if (oldBitmapBlock.test(rdpContent)) {
      rdpContent = rdpContent.replace(oldBitmapBlock, newBitmapBlock);

      // Add decompressed field to the emitted object
      rdpContent = rdpContent.replace(
        /isCompress: isCompress,\s*data: bitmapData/,
        'isCompress: isCompress,\n                decompressed: decompressed,\n                data: bitmapData'
      );

      fs.writeFileSync(rdpPath, rdpContent, 'utf8');
      console.log('[patch-rdpjs] Patched rdp.js — added decompressed flag to bitmap events.');
    } else {
      console.log('[patch-rdpjs] Could not find bitmap pattern in rdp.js. May already be modified.');
    }
  }
}
