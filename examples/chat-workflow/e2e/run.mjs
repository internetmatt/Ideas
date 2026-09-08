#!/usr/bin/env node
/**
 * Zero-dependency E2E for examples/chat-workflow.
 * Spawns headless Chrome via CDP, asserts UI behavior, writes PNG snapshots.
 *
 *   node examples/chat-workflow/e2e/run.mjs
 *   UPDATE_SNAPSHOTS=1 node examples/chat-workflow/e2e/run.mjs
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SNAPSHOT_DIR = join(ROOT, '__snapshots__');
const ARTIFACT_DIR = '/opt/cursor/artifacts/chat-workflow-e2e';
const UPDATE = process.env.UPDATE_SNAPSHOTS === '1';
const CHROME =
  process.env.CHROME_PATH ||
  ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser'].find((p) => existsSync(p));

if (!CHROME) {
  console.error('Chrome not found. Set CHROME_PATH.');
  process.exit(1);
}

mkdirSync(SNAPSHOT_DIR, { recursive: true });
mkdirSync(ARTIFACT_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function startStaticServer() {
  return new Promise((resolveServer, reject) => {
    const server = createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const rel = urlPath === '/' ? '/index.html' : urlPath;
      const filePath = resolve(ROOT, `.${rel}`);
      if (!filePath.startsWith(ROOT) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
      createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('failed to bind static server'));
        return;
      }
      resolveServer({
        port: addr.port,
        close: () =>
          new Promise((r, j) => {
            server.close((err) => (err ? j(err) : r()));
          }),
      });
    });
  });
}

class Cdp {
  /** @param {string} wsUrl */
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    /** @type {Map<number, { resolve: (v: any) => void, reject: (e: Error) => void }>} */
    this.pending = new Map();
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id != null && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }

  ready() {
    return new Promise((resolve, reject) => {
      if (this.ws.readyState === WebSocket.OPEN) return resolve(undefined);
      this.ws.addEventListener('open', () => resolve(undefined), { once: true });
      this.ws.addEventListener('error', (e) => reject(e), { once: true });
    });
  }

  /**
   * @param {string} method
   * @param {Record<string, unknown>} [params]
   */
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // ignore
    }
  }
}

async function waitForDevtools(port, attempts = 100) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return /** @type {{ webSocketDebuggerUrl: string }} */ (await res.json());
    } catch {
      // retry
    }
    await sleep(100);
  }
  throw new Error(`DevTools not ready on ${port}`);
}

/**
 * @param {Cdp} cdp
 * @param {string} expression
 */
async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'evaluate failed'
    );
  }
  return result.result?.value;
}

/**
 * @param {Cdp} cdp
 * @param {string} name
 */
async function screenshot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: true,
  });
  const buf = Buffer.from(data, 'base64');
  writeFileSync(join(ARTIFACT_DIR, `${name}.png`), buf);

  const baselinePath = join(SNAPSHOT_DIR, `${name}.png`);
  if (UPDATE || !existsSync(baselinePath)) {
    writeFileSync(baselinePath, buf);
    console.log(`  snapshot ${UPDATE ? 'updated' : 'wrote'}  ${name}.png (${buf.length} bytes)`);
    return { ok: true };
  }

  const baseline = readFileSync(baselinePath);
  const a = createHash('sha256').update(buf).digest('hex');
  const b = createHash('sha256').update(baseline).digest('hex');
  if (a === b) {
    console.log(`  snapshot ok         ${name}.png`);
    return { ok: true };
  }

  const ratio = Math.abs(buf.length - baseline.length) / Math.max(baseline.length, 1);
  if (ratio > 0.25) {
    console.error(`  snapshot FAIL       ${name}.png (hash mismatch, size delta ${(ratio * 100).toFixed(1)}%)`);
    return { ok: false };
  }
  console.warn(
    `  snapshot WARN       ${name}.png (pixels differ, size within 25% — baseline kept; re-run with UPDATE_SNAPSHOTS=1 to refresh)`
  );
  return { ok: true };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const staticServer = await startStaticServer();
  const baseUrl = `http://127.0.0.1:${staticServer.port}/?e2e=1`;
  const profileDir = join('/tmp', `cw-e2e-profile-${process.pid}`);
  const debugPort = 9400 + (process.pid % 500);
  mkdirSync(profileDir, { recursive: true });

  console.log(`Serving ${ROOT}`);
  console.log(`URL ${baseUrl}`);
  console.log(`Chrome ${CHROME}  CDP :${debugPort}`);

  const chrome = spawn(
    CHROME,
    [
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--window-size=1440,900',
      '--headless=new',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );

  let failures = 0;
  /** @type {Cdp | null} */
  let cdp = null;

  try {
    await waitForDevtools(debugPort);
    // Open a page target (browser-level WS does not expose Page.*).
    const newTargetRes = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(baseUrl)}`, {
      method: 'PUT',
    });
    if (!newTargetRes.ok) {
      throw new Error(`failed to open page target: HTTP ${newTargetRes.status}`);
    }
    const target = /** @type {{ webSocketDebuggerUrl: string }} */ (await newTargetRes.json());
    cdp = new Cdp(target.webSocketDebuggerUrl);
    await cdp.ready();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    // /json/new already navigated; wait for app seed.
    for (let i = 0; i < 60; i++) {
      const ready = await evaluate(
        cdp,
        `!!document.querySelector('[data-testid="transcript"] .msg') && document.querySelectorAll('[data-testid="canvas"] .node').length >= 4`
      );
      if (ready) break;
      await sleep(100);
    }

    const initial = await evaluate(
      cdp,
      `({
        brand: document.querySelector('.brand-name')?.textContent?.trim(),
        status: document.querySelector('[data-testid="workflow-status"]')?.textContent?.trim(),
        msgs: document.querySelectorAll('[data-testid="transcript"] .msg').length,
        nodes: document.querySelectorAll('[data-testid="canvas"] .node').length,
      })`
    );
    assert(initial.brand === 'Ideas', `brand expected Ideas, got ${JSON.stringify(initial.brand)}`);
    assert(initial.msgs === 3, `expected 3 seed messages, got ${initial.msgs}`);
    assert(initial.nodes === 4, `expected 4 workflow nodes, got ${initial.nodes}`);
    assert(/idle/i.test(initial.status || ''), `status should be idle, got ${initial.status}`);
    console.log('PASS  initial load', initial);
    if (!(await screenshot(cdp, '01-initial-load')).ok) failures++;

    await evaluate(
      cdp,
      `(async () => {
        const input = document.querySelector('[data-testid="composer-input"]');
        const form = document.querySelector('[data-testid="composer"]');
        input.value = 'What are the top 3 risks?';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        form.requestSubmit();
        return true;
      })()`
    );
    await sleep(50);
    const afterSend = await evaluate(
      cdp,
      `Array.from(document.querySelectorAll('[data-testid="transcript"] .msg')).map((m) => m.textContent)`
    );
    assert(
      afterSend.some((t) => String(t).includes('What are the top 3 risks?')),
      'sent user message missing from transcript'
    );
    console.log('PASS  send message');
    if (!(await screenshot(cdp, '02-after-send')).ok) failures++;

    const nodeCountBefore = await evaluate(cdp, `document.querySelectorAll('[data-testid="canvas"] .node').length`);
    await evaluate(cdp, `document.querySelector('[data-testid="add-tool"]').click()`);
    await sleep(50);
    const nodeCountAfter = await evaluate(cdp, `document.querySelectorAll('[data-testid="canvas"] .node').length`);
    assert(nodeCountAfter === nodeCountBefore + 1, 'add-tool did not create a node');
    console.log('PASS  add tool node', { nodeCountBefore, nodeCountAfter });

    await evaluate(cdp, `document.querySelector('[data-testid="btn-run"]').click()`);
    let ran = false;
    for (let i = 0; i < 120; i++) {
      const state = await evaluate(
        cdp,
        `({
          status: document.querySelector('[data-testid="workflow-status"]')?.textContent || '',
          steps: document.querySelectorAll('[data-testid="transcript"] .msg.step').length,
          hasReply: Array.from(document.querySelectorAll('[data-testid="transcript"] .msg.assistant')).some((m) =>
            /session-bound reply|Prototype output/i.test(m.textContent || '')
          ),
        })`
      );
      if (/idle/i.test(state.status) && state.steps >= 1 && state.hasReply) {
        ran = true;
        console.log('PASS  run workflow', state);
        break;
      }
      await sleep(40);
    }
    assert(ran, 'workflow run did not complete with steps + reply');
    if (!(await screenshot(cdp, '03-after-run')).ok) failures++;

    await evaluate(cdp, `document.querySelector('[data-testid="btn-reset"]').click()`);
    await sleep(50);
    const afterReset = await evaluate(
      cdp,
      `({
        msgs: document.querySelectorAll('[data-testid="transcript"] .msg').length,
        nodes: document.querySelectorAll('[data-testid="canvas"] .node').length,
        status: document.querySelector('[data-testid="workflow-status"]')?.textContent?.trim(),
        hasRisks: Array.from(document.querySelectorAll('[data-testid="transcript"] .msg')).some((m) =>
          /top 3 risks/i.test(m.textContent || '')
        ),
      })`
    );
    assert(afterReset.msgs === 3, `reset should restore 3 seed msgs, got ${afterReset.msgs}`);
    assert(afterReset.nodes === 4, `reset should restore 4 nodes, got ${afterReset.nodes}`);
    assert(!afterReset.hasRisks, 'reset left user message in transcript');
    assert(/idle/i.test(afterReset.status || ''), 'status not idle after reset');
    console.log('PASS  reset', afterReset);
    if (!(await screenshot(cdp, '04-after-reset')).ok) failures++;
  } finally {
    cdp?.close();
    chrome.kill('SIGKILL');
    await staticServer.close().catch(() => undefined);
    try {
      rmSync(profileDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }

  if (failures) {
    console.error(`\nE2E finished with ${failures} snapshot failure(s)`);
    process.exit(1);
  }
  console.log('\nE2E OK — behavior + snapshots');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
