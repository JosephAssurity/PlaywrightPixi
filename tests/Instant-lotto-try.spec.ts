import { test, expect, Page, Frame } from "@playwright/test";

const GAME_URL = 'https://mylotto.co.nz/instant-kiwi';

const INSTANT_LOTTO_PIXI_OBJECTS = {
  home: {
    autoPickButton: "stage.children[0].children[0].children[7].children[2].children[3].children[1]",
    tryButton: "stage.children[0].children[0].children[7].children[2].children[1].children[1]",
  },

  draw: {
    quickDrawButton: "stage.children[0].children[0].children[6].children[5].children[1]",
    drawButton: "stage.children[0].children[0].children[6].children[6].children[1]",
  },

  result: {
    tryAgainButton: "stage.children[0].children[0].children[13].children[3].children[1]",
    homeButton: "stage.children[0].children[0].children[12].children[2].children[2]",
    changeNumberButton: "stage.children[0].children[0].children[13].children[4].children[1]",
  },
} as const;

test.describe("Pixi E2E Automation Harness PoC", () => {
  test("can load game and click a Pixi button", async ({ page }) => {
    await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });
    await page.getByRole('button', { name: 'TRY' }).nth(27).click();

        const iframeHandle = await page
        .locator('iframe[title="Instant Kiwi Game"]')
        .elementHandle();

    if (!iframeHandle) {
        throw new Error("Instant Kiwi Game iframe not found");
    }

    const gameFrame = await iframeHandle.contentFrame();

    if (!gameFrame) {
        throw new Error("Instant Kiwi Game iframe contentFrame not available");
    }

    const gameCanvas = gameFrame.locator("canvas");

    await expect(gameCanvas).toBeVisible();

    await injectPixiStageCapture(gameFrame);

    const canvasBox = await gameCanvas.boundingBox();

    if (!canvasBox) {
        throw new Error("Canvas bounding box not found");
    }

    await page.mouse.move(
        canvasBox.x + canvasBox.width / 2,
        canvasBox.y + canvasBox.height / 2
    );

    await expect
        .poll(async () => {
        return await gameFrame.evaluate(() => Boolean((window as any).__pixiStage));
        })
        .toBe(true);

        //auto pick

    await waitForPixiObjectVisible(gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.home.autoPickButton);
    await clickPixiObjectByPath(page, gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.home.autoPickButton);
        //try
    await waitForPixiObjectVisible(gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.home.tryButton);
    await clickPixiObjectByPath(page, gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.home.tryButton);

        //draw
    await waitForPixiObjectVisible(gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.draw.drawButton);    
    await clickPixiObjectByPath(page,gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.draw.drawButton);

        //quickDraw
    await waitForPixiObjectVisible(gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.draw.quickDrawButton);
    await clickPixiObjectByPath(page, gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.draw.quickDrawButton);
        //assertions
    await waitForPixiObjectVisible(gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.result.tryAgainButton);
    await waitForPixiObjectVisible(gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.result.homeButton);
    await waitForPixiObjectVisible(gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.result.changeNumberButton);    
    
    await expectPixiObjectVisible(gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.result.tryAgainButton);
    await expectPixiObjectVisible(gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.result.homeButton);
    await expectPixiObjectVisible(gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.result.changeNumberButton);


  });

//   test("can open and close info panel", async ({ page }) => {
//     await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });

//     await expect(page.locator("canvas")).toBeVisible();

//     await injectPixiHarness(page);

//     await page.waitForTimeout(2000);

//     await expectPixiObjectVisible(page, Instant_Lotto_PIXI_OBJECTS.infoButton);

//     await clickPixiObjectByPath(page, Instant_Lotto_PIXI_OBJECTS.infoButton);

//     await expect
//       .poll(async () => {
//         return await pixiObjectExists(page, Instant_Lotto_PIXI_OBJECTS.closeButton);
//       })
//       .toBe(true);

//     await clickPixiObjectByPath(page, Instant_Lotto_PIXI_OBJECTS.closeButton);

//     await expect
//       .poll(async () => {
//         const state = await getPixiObjectState(page, Instant_Lotto_PIXI_OBJECTS.closeButton);
//         return !state || state.visible === false || state.width === 0 || state.height === 0;
//       })
//       .toBe(true);
//   });
});


async function getPixiObjectState(gameFrame: Frame, path: string) {
  return await gameFrame.evaluate((path) => {
    const target = (window as any).__getPixiByPath(path);

    if (!target) return null;

    const b = target.getBounds();

    return {
      exists: true,
      visible: target.visible,
      renderable: target.renderable,
      alpha: target.alpha,
      worldAlpha: target.worldAlpha,
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      text: (window as any).__collectPixiText?.(target) ?? "",
      interactive: target.interactive,
      buttonMode: target.buttonMode,
      eventMode: target.eventMode,
    };
  }, path);
}

async function pixiObjectExists(gameFrame: Frame, path: string) {
  const state = await getPixiObjectState(gameFrame, path);
  return Boolean(state && state.exists && state.width > 0 && state.height > 0);
}

async function expectPixiObjectVisible(gameFrame: Frame, path: string) {
  const state = await getPixiObjectState(gameFrame, path);

  expect(state, `Pixi object should exist: ${path}`).not.toBeNull();
  expect(state!.visible, `Pixi object should be visible: ${path}`).toBe(true);
  expect(state!.renderable, `Pixi object should be renderable: ${path}`).not.toBe(false);
  expect(state!.worldAlpha, `Pixi object should not be transparent: ${path}`).toBeGreaterThan(0);
  expect(state!.width, `Pixi object should have width: ${path}`).toBeGreaterThan(0);
  expect(state!.height, `Pixi object should have height: ${path}`).toBeGreaterThan(0);
}

async function clickPixiObjectByPath(page: Page, gameFrame: Frame, path: string) {
  const point = await gameFrame.evaluate((path) => {
    const target = (window as any).__getPixiByPath(path);

    if (!target) {
      throw new Error(`Pixi object not found: ${path}`);
    }

    const b = target.getBounds();

    return {
      x: b.x + b.width / 2,
      y: b.y + b.height / 2,
    };
  }, path);

  const canvasBox = await gameFrame.locator("canvas").boundingBox();

  if (!canvasBox) {
    throw new Error("Canvas bounding box not found");
  }

  await page.mouse.move(canvasBox.x + point.x, canvasBox.y + point.y);
  await page.mouse.down();
  await page.mouse.up();
}
async function injectPixiStageCapture(gameFrame: Frame) {
  await gameFrame.evaluate(() => {
    const InteractionManager =
      (window as any).PIXI?.interaction?.InteractionManager ||
      (window as any).PIXI?.InteractionManager;

    if (!InteractionManager) {
      throw new Error("Pixi InteractionManager not found in iframe");
    }

    const proto = InteractionManager.prototype;

    if (proto.__pixiStageCaptureInstalled) {
      return;
    }

    const original = proto.processInteractive;

    function getStageFromObject(obj: any) {
      let current = obj;

      while (current?.parent) {
        current = current.parent;
      }

      return current;
    }

    function collectPixiText(obj: any, texts: string[] = []) {
      if (!obj) return "";

      if (typeof obj.text === "string") {
        texts.push(obj.text);
      }

      for (const child of obj.children || []) {
        collectPixiText(child, texts);
      }

      return texts.join(" ");
    }

    proto.processInteractive = function (...args: any[]) {
      const obj = args[1];

      try {
        if (obj?.getBounds) {
          (window as any).__pixiStage = getStageFromObject(obj);
          (window as any).__lastPixiObject = obj;
        }
      } catch {
        // ignore Pixi traversal errors
      }

      return original.call(this, ...args);
    };

    proto.__pixiStageCaptureInstalled = true;

    (window as any).__getPixiByPath = function getPixiByPath(path: string) {
      const stage = (window as any).__pixiStage;

      if (!stage) {
        throw new Error("Pixi stage not captured yet. Move mouse over the canvas first.");
      }

      let current = stage;

      const parts = path
        .replace(/^stage\.?/, "")
        .split(".")
        .filter(Boolean);

      for (const part of parts) {
        const match = part.match(/^children\[(\d+)\]$/);

        if (!match) {
          throw new Error(`Unsupported Pixi path part: ${part}`);
        }

        current = current.children?.[Number(match[1])];

        if (!current) return null;
      }

      return current;
    };

    (window as any).__collectPixiText = collectPixiText;
  });
}
async function waitForPixiObjectVisible(
  gameFrame: Frame,
  path: string,
  timeout = 10000
) {
  await expect
    .poll(
      async () => {
        const state = await getPixiObjectState(gameFrame, path).catch(() => null);

        return Boolean(
          state &&
            state.exists &&
            state.visible &&
            state.renderable !== false &&
            state.worldAlpha > 0 &&
            state.width > 0 &&
            state.height > 0
        );
      },
      {
        timeout,
        message: `Waiting for Pixi object to be visible: ${path}`,
      }
    )
    .toBe(true);
}