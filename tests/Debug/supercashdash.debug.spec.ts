import { test, expect, Page, Response, Request } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const GAME_URL =
  'https://gameslnzcht1apac.lotteryplus.com/games/20259_nz_supercashdash/index.html' +
  '?rcPeriod=0' +
  '&rcSet=false' +
  '&funReal=-1' +
  '&fixedID=guest' +
  '&siteID=55' +
  '&brandID=540' +
  '&gameID=20259' +
  '&sessionID=guest' +
  '&lang=en' +
  '&sgch=1' +
  '&lobbyURL=https%3A%2F%2Fripley.cat.mylotto.co.nz%2Finstant-kiwi%2Fonline-games' +
  '&depositURL=https%3A%2F%2Fripley.cat.mylotto.co.nz%2Finstant-kiwi%2Fonline-games%2F54074751028%23top-up' +
  '&interval=null' +
  '&elapsed=null' +
  '&endpoint=irgslnzcht1apac.lotteryplus.com%2Firgs%2Fwebsocket' +
  '&channel=1' +
  '&device=null' +
  '&accessibilitymode=false' +
  '&operator=540';

const OUT_DIR = path.join(process.cwd(), 'debug-artifacts', 'supercashdash');

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeLog(file: string, lines: string[]) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
}

async function attachDiagnostics(page: Page, testName: string) {
  const logs: string[] = [];
  const failedRequests: string[] = [];
  const badResponses: string[] = [];
  const wsEvents: string[] = [];
  const frameEvents: string[] = [];

  const ts = () => new Date().toISOString();

  page.on('console', async msg => {
    let location = '';
    try {
      const loc = msg.location();
      if (loc?.url) {
        location = ` @ ${loc.url}:${loc.lineNumber ?? 0}:${loc.columnNumber ?? 0}`;
      }
    } catch {}
    logs.push(`[${ts()}] [console:${msg.type()}] ${msg.text()}${location}`);
  });

  page.on('pageerror', err => {
    logs.push(`[${ts()}] [pageerror] ${err.message}\n${err.stack ?? ''}`);
  });

  page.on('requestfailed', (request: Request) => {
    failedRequests.push(
      `[${ts()}] [requestfailed] ${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? 'unknown'}`
    );
  });

  page.on('response', async (response: Response) => {
    const status = response.status();
    if (status >= 400) {
      badResponses.push(
        `[${ts()}] [badresponse] ${status} ${response.request().method()} ${response.url()}`
      );
    }
  });

  page.on('frameattached', frame => {
    frameEvents.push(`[${ts()}] [frameattached] name=${frame.name() || '(no-name)'} url=${frame.url()}`);
  });

  page.on('framenavigated', frame => {
    frameEvents.push(`[${ts()}] [framenavigated] name=${frame.name() || '(no-name)'} url=${frame.url()}`);
  });

  page.on('websocket', ws => {
    wsEvents.push(`[${ts()}] [websocket-open] ${ws.url()}`);
    ws.on('framesent', event => {
      wsEvents.push(`[${ts()}] [ws-sent] ${ws.url()} :: ${truncate(event.payload)}`);
    });
    ws.on('framereceived', event => {
      wsEvents.push(`[${ts()}] [ws-received] ${ws.url()} :: ${truncate(event.payload)}`);
    });
    ws.on('close', () => {
      wsEvents.push(`[${ts()}] [websocket-close] ${ws.url()}`);
    });
    ws.on('socketerror', error => {
      wsEvents.push(`[${ts()}] [websocket-error] ${ws.url()} :: ${error}`);
    });
  });

  return {
    flush: () => {
      const base = path.join(OUT_DIR, testName);
      ensureDir(base);
      writeLog(path.join(base, 'console.log'), logs);
      writeLog(path.join(base, 'requestfailed.log'), failedRequests);
      writeLog(path.join(base, 'badresponses.log'), badResponses);
      writeLog(path.join(base, 'websockets.log'), wsEvents);
      writeLog(path.join(base, 'frames.log'), frameEvents);
    }
  };
}

function truncate(payload: string | Buffer | ArrayBuffer | ArrayBufferLike | Uint8Array | undefined | null, max = 300) {
  if (payload == null) return '';

  let s: string;
  if (typeof payload === 'string') {
    s = payload;
  } else if (Buffer.isBuffer(payload)) {
    s = payload.toString('utf8');
  } else if (payload instanceof Uint8Array) {
    s = Buffer.from(payload).toString('utf8');
  } else if (payload instanceof ArrayBuffer) {
    s = Buffer.from(new Uint8Array(payload)).toString('utf8');
  } else {
    // Fallback for other ArrayBufferLike
    try {
      s = Buffer.from(payload as any).toString('utf8');
    } catch {
      s = String(payload);
    }
  }

  return s.length > max ? s.slice(0, max) + '…' : s;
}

async function collectPageState(page: Page) {
  return await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;

    const canvases = Array.from(document.querySelectorAll('canvas')).map((canvas, i) => {
      const rect = canvas.getBoundingClientRect();

      let webgl = false;
      let glVersion: string | null = null;
      let glVendor: string | null = null;
      let glRenderer: string | null = null;

      try {
        const gl = (canvas.getContext('webgl2') ||
          canvas.getContext('webgl') ||
          canvas.getContext('experimental-webgl')) as
          | WebGL2RenderingContext
          | WebGLRenderingContext
          | null;

        if (gl) {
          // TS types for canvas.getContext can be broad; cast to any for WebGL-specific calls
          const glAny = gl as any;
          webgl = true;
          glVersion = glAny.getParameter(glAny.VERSION);
          const dbgExt = glAny.getExtension && glAny.getExtension('WEBGL_debug_renderer_info');
          if (dbgExt) {
            glVendor = glAny.getParameter(dbgExt.UNMASKED_VENDOR_WEBGL);
            glRenderer = glAny.getParameter(dbgExt.UNMASKED_RENDERER_WEBGL);
          }
        }
      } catch (e: any) {
        glVersion = `error: ${e?.message ?? e}`;
      }

      return {
        index: i,
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        },
        webgl,
        glVersion,
        glVendor,
        glRenderer
      };
    });

    return {
      title: document.title,
      href: location.href,
      readyState: document.readyState,
      userAgent: navigator.userAgent,
      visibilityState: document.visibilityState,
      bodyTextLength: body?.innerText?.length ?? 0,
      bodyBg: body ? getComputedStyle(body).backgroundColor : null,
      htmlBg: html ? getComputedStyle(html).backgroundColor : null,
      canvasCount: canvases.length,
      canvases
    };
  });
}

async function collectFrameState(page: Page, frameUrlPart: string) {
  const frame = page.frames().find(f => f.url().includes(frameUrlPart));
  if (!frame) return { found: false };

  try {
    const state = await frame.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;

      const canvases = Array.from(document.querySelectorAll('canvas')).map((canvas, i) => {
        const rect = canvas.getBoundingClientRect();

        let webgl = false;
        let glVersion: string | null = null;

        try {
          const gl =
            canvas.getContext('webgl2') ||
            canvas.getContext('webgl') ||
            canvas.getContext('experimental-webgl');
          if (gl) {
            webgl = true;
            // TS types canvas contexts as RenderingContext which may not have getParameter;
            // cast to any/WebGLRenderingContext to access getParameter safely at runtime.
            try {
              glVersion = (gl as any).getParameter((gl as any).VERSION);
            } catch (e: any) {
              glVersion = `error: ${e?.message ?? e}`;
            }
          }
        } catch (e: any) {
          glVersion = `error: ${e?.message ?? e}`;
        }

        return {
          index: i,
          width: canvas.width,
          height: canvas.height,
          clientWidth: canvas.clientWidth,
          clientHeight: canvas.clientHeight,
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          },
          webgl,
          glVersion
        };
      });

      return {
        found: true,
        href: location.href,
        title: document.title,
        readyState: document.readyState,
        bodyBg: body ? getComputedStyle(body).backgroundColor : null,
        htmlBg: html ? getComputedStyle(html).backgroundColor : null,
        canvasCount: canvases.length,
        canvases
      };
    });

    return state;
  } catch (error: any) {
    return {
      found: true,
      evaluationFailed: true,
      message: error?.message ?? String(error)
    };
  }
}

test.describe('Super Cash Dash Safari/WebKit blackscreen debug', () => {

  test('direct-load debug', async ({ page }) => {
    const diag = await attachDiagnostics(page, 'direct-load');

    await page.goto(GAME_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000
    });

    // Give the shell / assets / websocket time to initialize.
    await page.waitForTimeout(15000);

    const state = await collectPageState(page);

    const base = path.join(OUT_DIR, 'direct-load');
    ensureDir(base);

    fs.writeFileSync(
      path.join(base, 'page-state.json'),
      JSON.stringify(state, null, 2),
      'utf8'
    );

    await page.screenshot({
      path: path.join(base, 'page.png'),
      fullPage: true
    });

    diag.flush();

    // This is intentionally loose: we want artifacts even if things are broken.
    expect(page.url()).toContain('gameslnzcht1apac.lotteryplus.com');
  });

  test('iframe-load debug', async ({ page }) => {
    const diag = await attachDiagnostics(page, 'iframe-load');

    await page.setContent(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Iframe Harness Debug</title>
          <style>
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              background: #111;
              overflow: hidden;
            }
            #wrap {
              width: 100vw;
              height: 100vh;
              display: flex;
              align-items: stretch;
              justify-content: stretch;
            }
            iframe {
              width: 100%;
              height: 100%;
              border: 0;
              display: block;
              background: #000;
            }
          </style>
        </head>
        <body>
          <div id="wrap">
            <iframe
              id="game-frame"
              src="${GAME_URL}"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
              allow="autoplay; fullscreen"
            ></iframe>
          </div>
        </body>
      </html>
    `);

    const iframe = page.locator('#game-frame');
    await expect(iframe).toBeVisible();

    // Let iframe load + initialize assets.
    await page.waitForTimeout(20000);

    const hostState = await collectPageState(page);
    const frameState = await collectFrameState(page, '/games/20259_nz_supercashdash/index.html');

    const base = path.join(OUT_DIR, 'iframe-load');
    ensureDir(base);

    fs.writeFileSync(
      path.join(base, 'host-page-state.json'),
      JSON.stringify(hostState, null, 2),
      'utf8'
    );

    fs.writeFileSync(
      path.join(base, 'frame-state.json'),
      JSON.stringify(frameState, null, 2),
      'utf8'
    );

    await page.screenshot({
      path: path.join(base, 'host-page.png'),
      fullPage: true
    });

    await iframe.screenshot({
      path: path.join(base, 'iframe.png')
    });

    // Optional: if the game requires first interaction to resume audio/init rendering
    await iframe.click({ position: { x: 200, y: 200 }, trial: true }).catch(() => {});
    await page.waitForTimeout(3000);

    diag.flush();

    expect(iframe).toBeVisible();
  });
});