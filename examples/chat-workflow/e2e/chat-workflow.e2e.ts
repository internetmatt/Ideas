/**
 * Playwright E2E + screenshot snapshots for the chat+workflow prototype.
 *
 * Prefer the zero-dep CDP runner when npm is unavailable:
 *   node examples/chat-workflow/e2e/run.mjs
 *
 * With Playwright installed:
 *   npx playwright test examples/chat-workflow/e2e/chat-workflow.e2e.ts
 */
import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

function startServer(): Promise<{ port: number; close: () => Promise<void> }> {
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
      if (!addr || typeof addr === 'string') return reject(new Error('bind failed'));
      resolveServer({
        port: addr.port,
        close: () => new Promise((r, j) => server.close((e) => (e ? j(e) : r()))),
      });
    });
  });
}

test.describe('chat-workflow prototype', () => {
  let port = 0;
  let closeServer: () => Promise<void> = async () => undefined;

  test.beforeAll(async () => {
    const server = await startServer();
    port = server.port;
    closeServer = server.close;
  });

  test.afterAll(async () => {
    await closeServer();
  });

  test('load → send → add tool → run → reset (with screenshots)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`http://127.0.0.1:${port}/?e2e=1`);

    await expect(page.locator('.brand-name')).toHaveText('Ideas');
    await expect(page.getByTestId('transcript').locator('.msg')).toHaveCount(3);
    await expect(page.getByTestId('canvas').locator('.node')).toHaveCount(4);
    await expect(page.getByTestId('workflow-status')).toContainText(/idle/i);
    await expect(page).toHaveScreenshot('01-initial-load.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });

    await page.getByTestId('composer-input').fill('What are the top 3 risks?');
    await page.getByTestId('composer').evaluate((form) => (form as HTMLFormElement).requestSubmit());
    await expect(page.getByTestId('transcript')).toContainText('What are the top 3 risks?');
    await expect(page).toHaveScreenshot('02-after-send.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });

    const before = await page.getByTestId('canvas').locator('.node').count();
    await page.getByTestId('add-tool').click();
    await expect(page.getByTestId('canvas').locator('.node')).toHaveCount(before + 1);

    await page.getByTestId('btn-run').click();
    await expect(page.getByTestId('transcript').locator('.msg.step').first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId('workflow-status')).toContainText(/idle/i, { timeout: 15_000 });
    await expect(page.getByTestId('transcript')).toContainText(/session-bound reply|Prototype output/i);
    await expect(page).toHaveScreenshot('03-after-run.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });

    await page.getByTestId('btn-reset').click();
    await expect(page.getByTestId('transcript').locator('.msg')).toHaveCount(3);
    await expect(page.getByTestId('transcript')).not.toContainText('top 3 risks');
    await expect(page.getByTestId('canvas').locator('.node')).toHaveCount(4);
    await expect(page).toHaveScreenshot('04-after-reset.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});
