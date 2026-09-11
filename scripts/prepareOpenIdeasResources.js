/** Stage a prebuilt OpenIdeas desktop runtime for electron-builder. */

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function prepareOpenIdeasResources(options = {}) {
  const platform = options.platform || process.platform;
  const arch = options.arch || process.arch;
  const runtimeKey = `${platform}-${arch}`;
  const source = path.resolve(
    options.source ||
      process.env.AIONUI_OPENIDEAS_RUNTIME_DIR ||
      path.join(projectRoot, '..', 'OpenIdeas', 'dist', 'desktop-runtime', runtimeKey)
  );
  const destination = path.join(projectRoot, 'resources', 'bundled-openideas', runtimeKey);
  const executable = path.join(source, 'bin', platform === 'win32' ? 'node.exe' : 'node');
  const entrypoint = path.join(source, 'server', 'bin', 'run');

  if (!fs.existsSync(executable) || !fs.existsSync(entrypoint)) {
    const message = `[openideas] Runtime missing for ${runtimeKey}: ${source}`;
    if (process.env.AIONUI_OPENIDEAS_REQUIRED === '1') throw new Error(message);
    fs.mkdirSync(path.join(projectRoot, 'resources', 'bundled-openideas'), { recursive: true });
    console.warn(`${message}; DMG will use an externally managed OpenIdeas service`);
    return { staged: false, source, destination };
  }

  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true, dereference: true });
  fs.chmodSync(path.join(destination, 'bin', platform === 'win32' ? 'node.exe' : 'node'), 0o755);
  console.log(`[openideas] Staged ${runtimeKey} runtime from ${source}`);
  return { staged: true, source, destination };
}

if (require.main === module) {
  prepareOpenIdeasResources();
}

module.exports = { prepareOpenIdeasResources };
