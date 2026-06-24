import { Page, Frame, expect } from "@playwright/test";

const GAME_IFRAME = 'iframe[title="Instant Kiwi Game"]';

export async function getGameFrame(page: Page): Promise<Frame> {
  const iframeHandle = await page.locator(GAME_IFRAME).elementHandle();

  if (!iframeHandle) {
    throw new Error("Game iframe not found");
  }

  const frame = await iframeHandle.contentFrame();

  if (!frame) {
    throw new Error("Game frame not available");
  }

  return frame;
}

export async function waitForGameFrame(page: Page): Promise<Frame> {
  await page.waitForSelector(GAME_IFRAME, { state: "visible" });
  return await getGameFrame(page);
}


export async function waitForGameReady(
  page: Page,
  timeout = 5000 // 👈 default stays the same
): Promise<Frame> {

  const frame = await waitForGameFrame(page);

  // 👇 override here
  await expect(frame.locator("canvas")).toBeVisible({ timeout });

  return frame;
}

export async function getWalletBalance(frame: Frame): Promise<number> {
  const locator = frame.locator("#statusBar-balance .statusBar-value");

  // ✅ wait until at least 1 element exists
  await expect.poll(async () => {
    return await locator.count();
  }, { timeout: 10000 }).toBeGreaterThan(0);

  // ✅ wait until at least one element has a real numeric value
  let texts: string[] = [];

  await expect.poll(async () => {
    texts = await locator.allTextContents();

    const parsed = texts.map(t => Number(t.replace(/[^\d.]/g, "")));
    return parsed.some(n => !isNaN(n));
  }, { timeout: 5000 }).toBe(true);

  // ✅ now safely use FIRST element
  const walletText = texts[0];

  const wallet = Number(walletText.replace(/[^\d.]/g, ""));

  if (isNaN(wallet)) {
    throw new Error(`❌ Wallet text not numeric: "${walletText}"`);
  }

  return wallet;
}
//error handling for popups
export async function getErrorPopupMessage(frame: Frame): Promise<string> {
  const locator = frame.locator(".sgfe-error-popup__body");

  // ✅ 1. Wait until the error popup body exists and is visible
  await expect(locator).toBeVisible({ timeout: 10000 });

  // ✅ 2. Wait until the element actually contains text (not just empty)
  let errorMessage = "";
  await expect.poll(async () => {
    errorMessage = (await locator.textContent())?.trim() || "";
    return errorMessage.length > 0;
  }, { 
    message: "Wait for error message text to be populated",
    timeout: 5000 
  }).toBe(true);

  // ✅ 3. Return the clean string
  return errorMessage;
}

export async function isDemoMode(frame: Frame): Promise<boolean> {
  const locator = frame.locator(".blackbar-group");

  // Wait until at least one matching element has some text
  await expect
    .poll(async () => {
      const texts = await locator.allTextContents();
      return texts.some(t => t.trim().length > 0);
    }, { timeout: 10000 })
    .toBe(true);

  const texts = (await locator.allTextContents())
    .map(t => t.trim().toUpperCase())
    .filter(Boolean);

  return texts.some(t => t.includes("DEMO"));
}

export async function clickCanvasToPrimeAudio(page: Page, frame: Frame) {
  const canvas = frame.locator("canvas");
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("Canvas bounding box not found");
  }

  // Click roughly in the center of the canvas
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  console.log("🔊 Priming audio with real canvas click:", { x, y });

  await page.mouse.click(x, y);
}




