import { test, expect, Page, Frame } from "@playwright/test";
import { clickGameButton } from '../helpers/lobbyHelpers';
import * as pixi from "../helpers/pixiHelpers";

const GAME_URL = 'https://ripley.cat.mylotto.co.nz/instant-kiwi/online-games';

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
    await clickGameButton(page, 'Instant Lotto', 'TRY');

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

    await pixi.injectPixiStageCapture(gameFrame);

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

    await pixi.waitForPixiObjectVisible(gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.home.autoPickButton);
    await pixi.clickPixiObjectByPath(page, gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.home.autoPickButton);
        //try
    await pixi.waitForPixiObjectVisible(gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.home.tryButton);
    await pixi.clickPixiObjectByPath(page, gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.home.tryButton);

        //draw
    await pixi.waitForPixiObjectVisible(gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.draw.drawButton);    
    await pixi.clickPixiObjectByPath(page,gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.draw.drawButton);

        //quickDraw
    await pixi.waitForPixiObjectVisible(gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.draw.quickDrawButton);
    await pixi.clickPixiObjectByPath(page, gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.draw.quickDrawButton);
        //assertions
    await pixi.waitForPixiObjectVisible(gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.result.tryAgainButton);
    await pixi.waitForPixiObjectVisible(gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.result.homeButton);
    await pixi.waitForPixiObjectVisible(gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.result.changeNumberButton);    
    
    await pixi.expectPixiObjectVisible(gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.result.tryAgainButton);
    await pixi.expectPixiObjectVisible(gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.result.homeButton);
    await pixi.expectPixiObjectVisible(gameFrame, INSTANT_LOTTO_PIXI_OBJECTS.result.changeNumberButton);


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


